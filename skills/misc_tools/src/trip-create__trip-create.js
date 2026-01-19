// pages/trip-create/trip-create.js
const { tripApi, checkTestApi, tripTemplateApi, templateItemApi } = require('../../utils/api.js');
const { getCurrentUserId, isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    tripForm: {
      destination: '',
      locationId: null, // 城市locationId，用于天气API
      type: '',
      startDate: '',
      endDate: '',
      travelers: 1,
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
    
    // 加载模板列表
    this.loadTemplates();
  },

  // 加载模板列表
  async loadTemplates() {
    try {
      const response = await tripTemplateApi.getPublicTemplates();
      if (response.success && response.data) {
        this.setData({
          templates: response.data || []
        });
      } else {
        this.setData({
          templates: []
        });
      }
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
      this.setData({
        selectedTemplateId: template.id,
        selectedTemplate: template,
        templateIndex: templateIndex
      });
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
        // 预处理前10个物品用于预览
        const preview = items.slice(0, 10).map(item => ({
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

    this.setData({ 
      cityDialogVisible: false,
      'tripForm.destination': displayName,
      'tripForm.locationId': selectedCityRow.id
    });

    wx.showToast({
      title: `已选择：${displayName}`,
      icon: 'success'
    });

    // 立即加载该城市的30天天气预报
    if (selectedCityRow.id) {
      await this.loadWeather30Days(selectedCityRow.id, displayName);
    }
  },

  // 组合城市显示名称
  composeDisplayName(cityRow) {
    const parts = [cityRow.name];
    if (cityRow.adm2) parts.push(cityRow.adm2);
    if (cityRow.adm1) parts.push(cityRow.adm1);
    return parts.join(' · ');
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
        textDay: d.textDay,
        textNight: d.textNight,
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

  // 输入目的地
  onDestinationInput(e) {
    this.setData({
      cityQuery: e.detail.value
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
      'tripForm.startDate': startDate
    });
    
    // 如果返回日期早于或等于出发日期，清空返回日期
    if (this.data.tripForm.endDate && this.data.tripForm.endDate <= startDate) {
      this.setData({
        'tripForm.endDate': ''
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
      'tripForm.endDate': endDate
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

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      'tripForm.description': e.detail.value
    });
  },

  // 输入特殊需求
  onSpecialNeedsInput(e) {
    this.setData({
      'tripForm.specialNeeds': e.detail.value
    });
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
    const { tripForm } = this.data;
    const userId = getCurrentUserId() || 1;

    // 验证输入
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

    this.setData({ loading: true });

    try {
      const tripData = {
        userId: userId,
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
        templateId: this.data.selectedTemplateId || null  // 添加模板ID
      };
      
      const response = await tripApi.create(tripData);

      if (response.success) {
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
