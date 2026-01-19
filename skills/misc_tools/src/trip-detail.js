// pages/trip-detail/trip-detail.js
const { tripApi, itemApi, checkApi, checkTestApi, uploadApi, BASE_URL } = require('../../utils/api.js');
const { normalizeWeatherText } = require('../../utils/weather.js');
const { isLoggedIn } = require('../../utils/auth.js');
const { savePersistedTripCover } = require('../../utils/cityPictureCrawler.js');

Page({
  data: {
    tripId: null,
    trip: {},
    items: [],
    checkedCount: 0,
    totalItemsCount: 0,
    progressPercentage: 0,
    loading: false,
    // 天气相关
    weatherForecast30d: null,
    loadingWeather: false,
    weatherError: null,
    cityPictureUrl: '',
    cityPictureList: [],
    loadingPicture: false,
    pictureError: '',
    editingName: false,
    editNameValue: '',
    savingName: false,
    // 新增字段
    isChecklistExpanded: true, // 默认展开
    statusBarHeight: 44, // 默认值，在onLoad里获取
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    // 获取胶囊按钮位置，适配顶部导航高度
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 44
    });

    const tripId = options.id;
    if (tripId) {
      this.setData({ tripId: tripId });
    }
  },

  onShow() {
    const { tripId } = this.data;
    if (tripId) {
      this.fetchTripDetail(tripId);
      this.fetchItems(tripId);
    }
  },

  // 获取行程详情
  async fetchTripDetail(tripId) {
    this.setData({ loading: true });

    try {
      const response = await tripApi.getById(tripId);
      if (response.success) {
        const trip = response.data || {};
        // 计算倒计时
        const countdown = this.calculateCountdown(trip.startDate);
        this.setData({
          trip: {
            ...trip,
            countdown: countdown
          },
          editNameValue: trip.name || trip.destination || ''
        });


        // 如果有locationId和日期，加载天气信息
        if (trip.locationId && trip.startDate && trip.endDate) {
          await this.loadWeather30Days(trip.locationId, trip.destination);
        }
      } else {
        wx.showToast({
          title: response.message || '获取行程详情失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取行程详情错误:', error);
      wx.showToast({
        title: '获取行程详情失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取物品列表
  async fetchItems(tripId) {
    try {
      const response = await itemApi.getByTripId(tripId);
      if (response.success) {
        const items = response.data || [];
        // checked: 0=未查验, 1=已查验, 2=已跳过
        const checkedCount = items.filter(item => item.checked === 1).length;
        const totalCount = items.length;
        const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

        this.setData({
          items: items,
          checkedCount: checkedCount,
          totalItemsCount: totalCount,
          progressPercentage: progressPercentage
        });
      }
    } catch (error) {
      console.error('获取物品列表错误:', error);
    }
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

  // 格式化天气日期（返回格式化后的字符串）
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
    const { trip } = this.data;
    if (!trip.startDate || !trip.endDate || !dateStr) {
      return false;
    }
    try {
      const checkDate = new Date(dateStr);
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      
      checkDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    } catch {
      return false;
    }
  },


  handlePictureError() {
    try {
      const { cityPictureList, cityPictureUrl } = this.data;
      const remaining = (cityPictureList || []).filter(item => item && item !== cityPictureUrl);
      if (remaining.length > 0) {
        this.setData({
          cityPictureUrl: remaining[0],
          cityPictureList: remaining
        });
        if (this.data.tripId) {
          savePersistedTripCover(this.data.tripId, remaining[0]);
        }
      } else {
        // 使用本地默认图片
        const defaultImage = '/首页图片/pexels-souvenirpixels-417074.jpg';
        this.setData({
          cityPictureUrl: defaultImage,
          cityPictureList: [],
          pictureError: ''
        });
        if (this.data.tripId) {
          savePersistedTripCover(this.data.tripId, defaultImage);
        }
      }
    } catch (error) {
      console.error('handlePictureError 异常:', error);
      // 确保即使出错也设置默认图片
      const defaultImage = '/首页图片/pexels-souvenirpixels-417074.jpg';
      this.setData({
        cityPictureUrl: defaultImage,
        cityPictureList: [],
        pictureError: ''
      });
    }
  },

  handleWeatherIconError() {
    // 静默处理天气图标加载失败，不显示错误
    // 图标会自动隐藏，因为 wx:if 条件会检查 iconDay 是否存在
    try {
      if (this.data.weatherForecast30d && this.data.weatherForecast30d.forecast && this.data.weatherForecast30d.forecast.length > 0) {
        // 清除失败的图标URL，让wx:else显示默认图标
        const forecast = [...this.data.weatherForecast30d.forecast];
        if (forecast[0] && forecast[0].iconDay) {
          forecast[0].iconDay = '';
          this.setData({
            'weatherForecast30d.forecast': forecast
          });
        }
      }
    } catch (error) {
      // 静默失败，不抛出错误
      console.warn('天气图标加载失败:', error);
    }
  },

  changeTripCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths && res.tempFilePaths[0];
        if (!tempPath) {
          return;
        }
        this.saveCustomCover(tempPath);
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.includes('cancel')) {
          return;
        }
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  async saveCustomCover(tempPath) {
    if (!tempPath) return;
    const { tripId } = this.data;
    if (!tripId) {
      wx.showToast({
        title: '行程ID不存在',
        icon: 'none'
      });
      return;
    }

    // 显示上传进度
    wx.showLoading({
      title: '上传中...',
      mask: true
    });

    try {
      // 上传图片到后端
      const uploadResult = await uploadApi.uploadImage(tempPath);
      
      if (!uploadResult.success) {
        wx.hideLoading();
        wx.showToast({
          title: uploadResult.message || '上传失败',
          icon: 'none'
        });
        return;
      }

      const imageUrl = uploadResult.data;
      if (!imageUrl) {
        wx.hideLoading();
        wx.showToast({
          title: '上传失败：未获取到图片URL',
          icon: 'none'
        });
        return;
      }

      // 更新行程封面
      const updateResult = await tripApi.updateImg(tripId, { img: imageUrl });
      
      wx.hideLoading();
      
      if (updateResult.success) {
        // 更新本地状态
        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
        this.setData({
          cityPictureUrl: fullImageUrl,
          cityPictureList: [fullImageUrl],
          pictureError: '',
          'trip.img': fullImageUrl
        });
        
        // 保存到本地存储
        if (tripId) {
          savePersistedTripCover(tripId, fullImageUrl);
        }
        
        wx.showToast({
          title: '封面已更新',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: updateResult.message || '更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('上传图片失败:', error);
      wx.showToast({
        title: '上传失败，请稍后重试',
        icon: 'none'
      });
    }
  },

  startEditName() {
    const currentName = this.data.trip?.name || this.data.trip?.destination || '';
    this.setData({
      editingName: true,
      editNameValue: currentName
    });
  },

  handleNameInput(e) {
    this.setData({
      editNameValue: e.detail.value
    });
  },

  cancelEditName() {
    this.setData({
      editingName: false,
      editNameValue: this.data.trip?.name || this.data.trip?.destination || ''
    });
  },

  async saveTripName() {
    const { tripId, editNameValue } = this.data;
    if (!tripId) return;
    const name = (editNameValue || '').trim();
    if (!name) {
      wx.showToast({
        title: '名称不能为空',
        icon: 'none'
      });
      return;
    }
    this.setData({ savingName: true });
    try {
      const resp = await tripApi.updateName(tripId, { name });
      if (resp.success) {
        this.setData({
          'trip.name': name,
          editingName: false,
          editNameValue: name
        });
        wx.showToast({
          title: '名称已更新',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: resp.message || '更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('更新行程名称失败:', error);
      wx.showToast({
        title: '更新失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ savingName: false });
    }
  },

  // 查看物品清单
  viewChecklist() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/checklist/checklist?tripId=${tripId}`
    });
  },

  // 开始查验
  startCheck() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/check-process/check-process?tripId=${tripId}`
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'preparing': '准备中',
      'ongoing': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知';
  },

  // 获取类型文本
  getTypeText(type) {
    const map = {
      tourism: '旅游',
      business: '商务',
      family: '探亲',
      other: '其他'
    };
    return map[type] || type || '其他';
  },

  // 切换物品清单展开/收起
  toggleChecklist() {
    this.setData({
      isChecklistExpanded: !this.data.isChecklistExpanded
    });
  },

  // 底部导航返回
  navigateBack() {
    wx.navigateBack();
  },

  // 计算倒计时天数
  calculateCountdown(startDate) {
    if (!startDate) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 小程序中不需要特殊处理，catchtap已经阻止冒泡
  }
});
