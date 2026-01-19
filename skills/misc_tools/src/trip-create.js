// pages/trip-create/trip-create.js
const { tripApi, checkTestApi, tripTemplateApi, templateItemApi,pictureCrawlerApi } = require('../../utils/api.js');
const { getCurrentUserId, isLoggedIn, isGuestMode } = require('../../utils/auth.js');
const { normalizeWeatherText } = require('../../utils/weather.js');
const { fetchCityPictures, extractPrimaryCityName, getCityPictureCache, saveCityPictureCache, savePersistedTripCover } = require('../../utils/cityPictureCrawler.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

Page({
  data: {
    navHeight: 0, // 导航栏高度
    destinationFocused: false, // 目的地输入框是否聚焦
    formattedStartDate: '', // 格式化的出发日期显示
    formattedEndDate: '', // 格式化的返程日期显示
    tripForm: {
      name: '',
      destination: '',
      locationId: null, // 城市locationId，用于天气API
      type: '',
      startDate: '',
      endDate: '',
      travelers: 1, // 默认1人
      budget: '',
      description: '',
      specialNeeds: ''
    },
    cityQuery: '',
    cityList: [],
    selectedCityId: null,
    selectedCityRow: null,
    cityDialogVisible: false,
    cityLoading: false,
    loading: false,
    typeIndex: -1,
    typeLabel: '',
    templateIndex: -1,
    // 天气相关
    weatherForecast30d: null,
    loadingWeather: false,
    weatherError: null,
    // 城市图片相关
    loadingPicture: false,
    cityPictureUrl: '',
    cityPictureList: [],
    pictureError: '',
    // 模板相关
    templates: [],
    selectedTemplateId: null,
    selectedTemplate: null,
    templateItems: [],
    templateItemsPreview: [], // 用于预览，只显示前10个
    loadingTemplateItems: false
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    if (menuButtonInfo) {
      const navHeight = menuButtonInfo.top + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight);
      this.setData({ navHeight });
    }
    
    // 加载模板列表
    this.loadTemplates();
  },

  // 格式化日期显示 (MM.DD)
  formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}.${parts[2]}`;
    }
    return dateStr;
  },
// 刷新
  async reflash(){
    wx.redirectTo({
        url: '/pages/trip-create/trip-create'
      });
      wx.showLoading({
        title: '加载中...', // 提示文本
        mask: true,        // 是否显示透明蒙层，防止触摸穿透
        duration: 1000,    // 提示的延迟时间（单位：ms），默认1500，设为0则不自动关闭
      });
  },
  // 加载模板列表
  async loadTemplates() {
    const userId = getCurrentUserId();
    try {
      const [publicResp, myResp] = await Promise.all([
        tripTemplateApi.getPublicTemplates(),
        userId ? tripTemplateApi.getByCreatedBy(userId, userId) : Promise.resolve({ success: false, data: [] })
      ]);
      
      const templates = [];
      const userIdNum = parseInt(userId);
      const templateMap = new Map(); // 用于去重
      
      // 处理我的模板：created_by = 当前用户
      if (myResp.success && Array.isArray(myResp.data)) {
        myResp.data.forEach(t => {
          const labels = [];
          if (t.createdBy === userIdNum) {
            labels.push('个人');
          }
          const isPublic = t.isPublic === 1 || t.isPublic === true;
          if (!isPublic) {
            labels.push('私人');
          }
          const labelText = labels.length > 0 ? `【${labels.join('·')}】` : '';
          const templateKey = `${t.id}`;
          if (!templateMap.has(templateKey)) {
            templateMap.set(templateKey, {
              ...t,
              scope: 'mine',
              displayName: `${labelText}${t.name || ''}`
            });
          }
        });
      }
      
      // 处理公共模板：后端已经过滤了is_public=1且is_status=1的模板，直接使用
      if (publicResp.success && Array.isArray(publicResp.data)) {
        publicResp.data.forEach(t => {
          const labels = [];
          if (t.createdBy === userIdNum) {
            labels.push('个人');
          }
          // 公共模板不标注"私人"
          const labelText = labels.length > 0 ? `【${labels.join('·')}】` : '';
          const templateKey = `${t.id}`;
          if (!templateMap.has(templateKey)) {
            templateMap.set(templateKey, {
              ...t,
              scope: 'public',
              displayName: `${labelText}${t.name || ''}`
            });
          }
        });
      }
      
      // 转换为数组
      const templateArray = Array.from(templateMap.values());
      
      this.setData({
        templates: templateArray
      });
    } catch (error) {
      console.error('加载模板失败:', error);
      this.setData({
        templates: []
      });
    }
  },

  // 处理模板变化
  async handleTemplateChange(e) {
    const templateIndex = e.detail.value;
    const templates = this.data.templates;
    
    if (templateIndex >= 0 && templateIndex < templates.length) {
      const template = templates[templateIndex];
      const updates = {
        selectedTemplateId: template.id,
        selectedTemplate: template,
        templateIndex: templateIndex
      };
      const currentName = (this.data.tripForm.name || '').trim();
      if (!currentName && template.name) {
        updates['tripForm.name'] = template.name;
      }
      this.setData(updates);
      wx.showToast({
        title: `已选择模板：${template.name}`,
        icon: 'success'
      });
      // 加载模板物品列表
      await this.loadTemplateItems(template.id);
      } else {
        this.setData({
          selectedTemplateId: null,
          selectedTemplate: null,
          templateItems: [],
          templateItemsPreview: [],
          templateIndex: -1
        });
      }
  },

  // 加载模板物品列表
  async loadTemplateItems(templateId) {
    if (!templateId) return;
    
    this.setData({ loadingTemplateItems: true });
    try {
      const response = await templateItemApi.getByTemplateId(templateId);
      if (response.success && response.data) {
        const items = response.data || [];
        
        // 检查并标记禁用物品
        const disabledItems = items.filter(item => {
          return item.itemOverviewId != null && 
                 (item.isActive === false || item.isActive === 0);
        });
        
        // 如果有禁用物品，显示提示
        if (disabledItems.length > 0) {
          const displayItems = disabledItems.slice(0, 5);
          const disabledItemNames = displayItems.map(item => item.name || '未知物品').join('、');
          const moreText = disabledItems.length > 5 ? `等 ${disabledItems.length} 个` : '';
          
          wx.showModal({
            title: '禁用物品提示',
            content: `该模板包含 ${disabledItems.length} 个已禁用的物品：${disabledItemNames}${moreText}。\n\n这些物品在创建行程时不会被添加。`,
            showCancel: false,
            confirmText: '我知道了'
          });
        }
        
        // 预处理前10个物品用于预览（只显示激活的物品）
        const activeItems = items.filter(item => {
          return !(item.itemOverviewId != null && 
                   (item.isActive === false || item.isActive === 0));
        });
        const preview = activeItems.slice(0, 10).map(item => ({
          ...item,
          id: item.id || Math.random() // 确保有id
        }));
        this.setData({
          templateItems: items,
          templateItemsPreview: preview
        });
      } else {
        this.setData({
          templateItems: [],
          templateItemsPreview: []
        });
      }
    } catch (error) {
      console.error('加载模板物品失败:', error);
      this.setData({
        templateItems: [],
        templateItemsPreview: []
      });
    } finally {
      this.setData({ loadingTemplateItems: false });
    }
  },

  // 查询城市列表
  async queryCityList() {
    const { cityQuery } = this.data;
    if (!cityQuery || !cityQuery.trim()) {
      wx.showToast({
        title: '请输入目的地关键词',
        icon: 'none'
      });
      return;
    }

    this.setData({ 
      cityLoading: true, 
      cityDialogVisible: true,
      cityList: [],
      selectedCityId: null,
      selectedCityRow: null
    });

    try {
      const response = await checkTestApi.getCityList(cityQuery.trim());
      // 后端getCityList接口直接返回数组，或者包装在data中
      let cityListData = [];
      if (Array.isArray(response)) {
        cityListData = response;
      } else if (response.success && response.data) {
        cityListData = response.data;
      } else if (response.data && Array.isArray(response.data)) {
        cityListData = response.data;
      }
      
      this.setData({
        cityList: cityListData
      });
      
      if (!cityListData || cityListData.length === 0) {
        wx.showToast({
          title: '未查询到城市',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('查询城市错误:', error);
      wx.showToast({
        title: '查询城市失败，请检查网络连接',
        icon: 'none'
      });
      this.setData({
        cityList: []
      });
    } finally {
      this.setData({ cityLoading: false });
    }
  },

  // 选择城市
  handleSelectCityRow(e) {
    const city = e.currentTarget ? e.currentTarget.dataset.city : e;
    if (!city) return;
    
    this.setData({
      selectedCityId: city.id,
      selectedCityRow: city
    });
  },

  // 确认选择城市
  async confirmSelectCity() {
    const { selectedCityRow, selectedCityId } = this.data;
    
    if (!selectedCityId || !selectedCityRow) {
      wx.showToast({
        title: '请选择城市',
        icon: 'none'
      });
      return;
    }

    // 组合显示名称（城市名 · 地区 · 省/州）
    const displayName = this.composeDisplayName(selectedCityRow);

    const updates = { 
      cityDialogVisible: false,
      'tripForm.destination': displayName,
      'tripForm.locationId': selectedCityRow.id
    };
    const currentName = (this.data.tripForm.name || '').trim();
    if (!currentName) {
      updates['tripForm.name'] = displayName;
    }
    this.setData(updates);

    wx.showToast({
      title: `已选择：${displayName}`,
      icon: 'success'
    });

    // 立即加载该城市的30天天气预报
    if (selectedCityRow.id) {
      await this.loadWeather30Days(selectedCityRow.id, displayName);
    }

    await this.loadCityPicture(displayName);
  },

  // 组合城市显示名称（格式：省 · 市 · 区/镇）
  composeDisplayName(cityRow) {
    const parts = [];
    if (cityRow.adm1) parts.push(cityRow.adm1); // 省
    if (cityRow.adm2) parts.push(cityRow.adm2); // 市
    if (cityRow.name) parts.push(cityRow.name); // 区/镇
    return parts.join('·');
  },

  // 加载30天天气预报
  async loadWeather30Days(locationId, cityName) {
    if (!locationId) {
      return;
    }

    this.setData({
      loadingWeather: true,
      weatherError: null,
      weatherForecast30d: null
    });

    try {
      const resp = await checkTestApi.getWeather30d(locationId);
      const parsed = this.parseHe30d(resp, cityName || '未知城市');
      
      // 格式化日期并为每个天气项添加格式化后的日期和是否在行程范围内的标记
      if (parsed && parsed.forecast) {
        parsed.forecast = parsed.forecast.map(day => {
          return {
            ...day,
            formattedDate: this.formatWeatherDate(day.date),
            isInTripRange: this.isDateInTripRange(day.date)
          };
        });
      }
      
      this.setData({
        weatherForecast30d: parsed
      });

      if (parsed.hasError) {
        this.setData({
          weatherError: parsed.errorMessage || '获取天气失败'
        });
      }
    } catch (error) {
      console.error('获取30天天气预报失败:', error);
      this.setData({
        weatherError: '获取天气失败: ' + (error?.message || error),
        weatherForecast30d: null
      });
    } finally {
      this.setData({ loadingWeather: false });
    }
  },

  // 解析30天天气预报数据
  parseHe30d(payload, cityName) {
    let data;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch {
        data = {};
      }
    } else {
      data = payload;
    }
    const ok = data && (data.code === '200' || data.code === 200);
    const daily = ok && Array.isArray(data.daily) ? data.daily : [];
    return {
      city: cityName,
      hasError: !ok,
      errorMessage: ok ? '' : (data?.message || '获取30天预报失败'),
      forecast: daily.map(d => ({
        date: d.fxDate,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        textDay: normalizeWeatherText(d.textDay, d.iconDay, 'day'),
        textNight: normalizeWeatherText(d.textNight, d.iconNight, 'night'),
        iconDay: d.iconDay ? `https://icons.qweather.com/assets/icons/${d.iconDay}.svg` : '',
        iconNight: d.iconNight ? `https://icons.qweather.com/assets/icons/${d.iconNight}.svg` : ''
      }))
    };
  },

  // 格式化天气日期
  formatWeatherDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      
      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '明天';
      } else if (diffDays === 2) {
        return '后天';
      } else {
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();
        const weekday = weekdays[targetDate.getDay()];
        return `${month}/${day} ${weekday}`;
      }
    } catch {
      return '';
    }
  },

  // 判断日期是否在行程日期范围内
  isDateInTripRange(dateStr) {
    const { tripForm } = this.data;
    if (!tripForm.startDate || !tripForm.endDate || !dateStr) {
      return false;
    }
    try {
      const checkDate = new Date(dateStr);
      const startDate = new Date(tripForm.startDate);
      const endDate = new Date(tripForm.endDate);
      
      checkDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    } catch {
      return false;
    }
  },

  // 加载城市图片（前端爬虫）
  async loadCityPicture(displayName) {
    const keyword = extractPrimaryCityName(displayName);
    // console.log(keyword)
    if (!keyword) {
      this.setData({
        loadingPicture: false,
        cityPictureUrl: '',
        cityPictureList: [],
        pictureError: ''
      });
      return;
    }


    this.setData({
      loadingPicture: true,
      pictureError: '',
      cityPictureUrl: '',
      cityPictureList: []
    });

    try {
      const response = await pictureCrawlerApi.search(keyword, 1);
      if (response.success && response.data && response.data.length > 0) {
        this.setData({
          cityPictureUrl: response.data[0],
          cityPictureList: response.data
        });
      } else {
        wx.showToast({ title: response.message || '生成失败', icon: 'none' });
        this.setData({ loadingPicture: false });
      }
    } catch (error) {
      console.error('生成图片错误:', error);
      wx.showToast({ title: '生成失败', icon: 'none' });
      this.setData({ loadingPicture: false });
    } finally {
        this.setData({
          loadingPicture: false
        });
      }
  },

  refreshCityPicture() {
    const { tripForm } = this.data;
    if (!tripForm.destination) {
      wx.showToast({
        title: '请先选择目的地',
        icon: 'none'
      });
      return;
    }
    this.loadCityPicture(tripForm.destination, { force: true });
  },

  switchCityPicture(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    this.setData({
      cityPictureUrl: url
    });
  },

  previewCityPicture() {
    const { cityPictureUrl, cityPictureList } = this.data;
    if (!cityPictureUrl) return;
    wx.previewImage({
      urls: cityPictureList && cityPictureList.length > 0 ? cityPictureList : [cityPictureUrl],
      current: cityPictureUrl
    });
  },

  handlePictureError() {
    const { cityPictureList, cityPictureUrl } = this.data;
    const remaining = (cityPictureList || []).filter(url => url !== cityPictureUrl);
    if (remaining.length > 0) {
      this.setData({
        cityPictureUrl: remaining[0],
        cityPictureList: remaining
      });
    } else {
      this.setData({
        cityPictureUrl: '',
        cityPictureList: [],
        pictureError: '图片加载失败，请重新生成'
      });
    }
  },

  handleWeatherIconError(e) {
    // 静默处理天气图标加载失败，不显示错误
    try {
      const index = e.currentTarget.dataset.index;
      if (this.data.weatherForecast30d && this.data.weatherForecast30d.forecast && this.data.weatherForecast30d.forecast[index]) {
        // 清除失败的图标URL
        const forecast = [...this.data.weatherForecast30d.forecast];
        forecast[index].iconDay = '';
        this.setData({
          'weatherForecast30d.forecast': forecast
        });
      }
    } catch (error) {
      // 静默失败，不抛出错误
      console.warn('天气图标加载失败:', error);
    }
  },

  handleThumbnailError(e) {
    const url = e.currentTarget.dataset.url;
    const { cityPictureList } = this.data;
    const filtered = (cityPictureList || []).filter(item => item !== url);
    this.setData({
      cityPictureList: filtered
    });
    if (this.data.cityPictureUrl === url && filtered.length > 0) {
      this.setData({ cityPictureUrl: filtered[0] });
    }
  },

  // 输入目的地
  onDestinationInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        cityQuery: '',
        'tripForm.destination': ''
      });
      // 提示用户
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      cityQuery: value
    });
  },

  // 选择出行类型
  onTypeChange(e) {
    const types = ['tourism', 'business', 'family', 'other'];
    const typeLabels = ['旅游', '商务', '探亲', '其他'];
    const typeIndex = e.detail.value;
    this.setData({
      'tripForm.type': types[typeIndex] || '',
      typeIndex: typeIndex,
      typeLabel: typeLabels[typeIndex] || ''
    });
  },

  // 选择出发日期
  onStartDateChange(e) {
    const startDate = e.detail.value;
    this.setData({
      'tripForm.startDate': startDate,
      formattedStartDate: this.formatDateDisplay(startDate)
    });
    
    // 如果返回日期早于或等于出发日期，清空返回日期
    if (this.data.tripForm.endDate && this.data.tripForm.endDate <= startDate) {
      this.setData({
        'tripForm.endDate': '',
        formattedEndDate: ''
      });
    }

    // 如果已选择城市且有日期，更新天气显示的行程日期范围标记
    if (this.data.tripForm.locationId && startDate && this.data.tripForm.endDate) {
      // 重新格式化天气数据中的日期范围标记
      if (this.data.weatherForecast30d && this.data.weatherForecast30d.forecast) {
        const updatedForecast = this.data.weatherForecast30d.forecast.map(day => {
          return {
            ...day,
            isInTripRange: this.isDateInTripRange(day.date)
          };
        });
        this.setData({
          'weatherForecast30d.forecast': updatedForecast
        });
      }
    }
  },

  // 选择返回日期
  onEndDateChange(e) {
    const endDate = e.detail.value;
    const { tripForm } = this.data;
    
    if (endDate && tripForm.startDate && endDate <= tripForm.startDate) {
      wx.showToast({
        title: '返回日期必须晚于出发日期',
        icon: 'none'
      });
      return;
    }

    this.setData({
      'tripForm.endDate': endDate,
      formattedEndDate: this.formatDateDisplay(endDate)
    });

    // 如果已选择城市且有日期，更新天气显示的行程日期范围标记
    if (this.data.tripForm.locationId && tripForm.startDate && endDate) {
      // 重新格式化天气数据中的日期范围标记
      if (this.data.weatherForecast30d && this.data.weatherForecast30d.forecast) {
        const updatedForecast = this.data.weatherForecast30d.forecast.map(day => {
          return {
            ...day,
            isInTripRange: this.isDateInTripRange(day.date)
          };
        });
        this.setData({
          'weatherForecast30d.forecast': updatedForecast
        });
      }
    }
  },

  // 输入同行人数
  onTravelersChange(e) {
    this.setData({
      'tripForm.travelers': parseInt(e.detail.value) || 1
    });
  },

  // 增加人数
  onIncrease() {
    const current = parseInt(this.data.tripForm.travelers) || 1;
    this.setData({
      'tripForm.travelers': current + 1
    });
  },

  // 减少人数
  onDecrease() {
    const current = parseInt(this.data.tripForm.travelers) || 1;
    if (current > 1) {
      this.setData({
        'tripForm.travelers': current - 1
      });
    }
  },

  // 选择出行模式
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const typeMap = {
      'tourism': 'tourism',
      'business': 'business',
      'family': 'family',
      'other': 'other'
    };
    const labelMap = {
      'tourism': '旅游',
      'business': '商务',
      'family': '探亲',
      'other': '其他'
    };
    const typeIndexMap = {
      'tourism': 0,
      'business': 1,
      'family': 2,
      'other': 3
    };
    
    this.setData({
      'tripForm.type': typeMap[mode] || '',
      typeIndex: typeIndexMap[mode] !== undefined ? typeIndexMap[mode] : -1,
      typeLabel: labelMap[mode] || ''
    });
  },

  // 输入描述
  onDescriptionInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        'tripForm.description': ''
      });
      // 提示用户
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'tripForm.description': value
    });
  },

  // 输入特殊需求
  onSpecialNeedsInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        'tripForm.specialNeeds': ''
      });
      // 提示用户
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'tripForm.specialNeeds': value
    });
  },

  onTripNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 延迟清空输入，确保在输入事件之后执行
      setTimeout(() => {
        this.setData({
          'tripForm.name': ''
        });
      }, 0);
      // 提示用户
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'tripForm.name': value
    });
  },

  // 目的地输入框聚焦
  onDestinationFocus() {
    this.setData({
      destinationFocused: true
    });
  },

  // 目的地输入框失焦
  onDestinationBlur() {
    // 延迟失焦，确保确认按钮点击事件能触发
    setTimeout(() => {
      this.setData({
        destinationFocused: false
      });
    }, 200);
  },

  // 关闭城市对话框
  closeCityDialog() {
    this.setData({ cityDialogVisible: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 小程序中不需要特殊处理，catchtap已经阻止冒泡
  },

  // 取消创建
  onCancel() {
    wx.navigateBack();
  },

  // 创建行程
  async handleCreate() {
    // 游客模式拦截
    if (isGuestMode()) {
      wx.showModal({
        title: '游客模式',
        content: '当前属于游客模式，请你退出后授权登录',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    const { tripForm } = this.data;
    const userId = getCurrentUserId() || 1;

    // 验证输入
    if (!tripForm.name || !tripForm.name.trim()) {
      wx.showToast({
        title: '请输入行程名称',
        icon: 'none'
      });
      return;
    }

    if (!tripForm.destination) {
      wx.showToast({
        title: '请输入目的地',
        icon: 'none'
      });
      return;
    }

    if (!tripForm.type) {
      wx.showToast({
        title: '请选择出行类型',
        icon: 'none'
      });
      return;
    }

    if (!tripForm.startDate) {
      wx.showToast({
        title: '请选择出发日期',
        icon: 'none'
      });
      return;
    }

    if (!tripForm.endDate) {
      wx.showToast({
        title: '请选择返回日期',
        icon: 'none'
      });
      return;
    }

    if (tripForm.endDate <= tripForm.startDate) {
      wx.showToast({
        title: '返回日期必须晚于出发日期',
        icon: 'none'
      });
      return;
    }

    // 验证出发日期必须在今天之后
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(tripForm.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate.getTime() <= today.getTime()) {
      wx.showToast({
        title: '出发日期必须在今天之后',
        icon: 'none'
      });
      return;
    }

    // 计算行程天数
    const startDateObj = new Date(tripForm.startDate);
    const endDateObj = new Date(tripForm.endDate);
    const duration = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // 检测敏感词
    const tripName = tripForm.name.trim();
    if (containsSensitiveWord(tripName)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (tripForm.destination && containsSensitiveWord(tripForm.destination)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (tripForm.description && containsSensitiveWord(tripForm.description)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (tripForm.specialNeeds && containsSensitiveWord(tripForm.specialNeeds)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const tripData = {
        userId: userId,
        name: tripName,
        destination: tripForm.destination,
        locationId: tripForm.locationId || null, // 城市locationId，用于天气API
        type: tripForm.type,
        startDate: tripForm.startDate,
        endDate: tripForm.endDate,
        duration: duration,
        travelers: tripForm.travelers,
        budget: tripForm.budget || null,
        description: tripForm.description || '',
        specialNeeds: tripForm.specialNeeds || '',
        status: 'preparing',
        templateId: this.data.selectedTemplateId || null,  // 添加模板ID
        img: this.data.cityPictureUrl || null  // 添加图片URL
      };
      
      const response = await tripApi.create(tripData);

      if (response.success) {
        const newTripId = response && response.data ? response.data.id : null;
        const itemCount = this.data.templateItems.length;
        if (this.data.selectedTemplateId && itemCount > 0) {
          wx.showToast({
            title: `创建成功！已自动添加 ${itemCount} 个物品`,
            icon: 'success',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
        }

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: response.message || '创建失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('创建行程错误:', error);
      wx.showToast({
        title: '创建失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});