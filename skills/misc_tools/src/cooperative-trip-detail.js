// pages/cooperative-trip-detail/cooperative-trip-detail.js
const { cooperativeTripApi, cooperativeItemApi } = require('../../utils/api-cooperative.js');
const { checkTestApi, uploadApi, BASE_URL } = require('../../utils/api.js');
const { normalizeWeatherText } = require('../../utils/weather.js');
const { isLoggedIn, getCurrentUserId } = require('../../utils/auth.js');
const { fetchCityPictures, extractPrimaryCityName, getCityPictureCache, saveCityPictureCache, getPersistedTripCover, savePersistedTripCover } = require('../../utils/cityPictureCrawler.js');

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
    memberProgress: [],
    memberFilter: 'all',
    inviteDialogVisible: false,
    isCreator: false,
    inviteCode: '',
    qrImage: '',
    wechatLink: '',
    shareToken: '',
    shareLoading: false,
    canStartCheck: true,
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

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
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
      const userId = getCurrentUserId();
      const response = await cooperativeTripApi.getById(tripId, userId);
      if (response.success) {
        const trip = response.trip || response.data || {};
        const memberProgress = response.memberProgress || [];
        const currentUserId = getCurrentUserId();
        // 计算倒计时
        const countdown = this.calculateCountdown(trip.startDate);
        this.setData({
          trip: {
            ...trip,
            countdown: countdown
          },
          memberProgress: memberProgress,
          editNameValue: trip.name || trip.destination || '',
          isCreator: !!(currentUserId && trip.creatorId === currentUserId)
        });
        this.updateStartCheckAbility(trip);

        if (trip.destination) {
          const persistedCover = getPersistedTripCover(trip.id);
          if (persistedCover) {
            this.setData({
              cityPictureUrl: persistedCover,
              cityPictureList: [persistedCover],
              pictureError: ''
            });
          } else {
            this.loadCityPicture(trip.destination);
          }
        } else {
          this.setData({
            cityPictureUrl: '',
            cityPictureList: [],
            pictureError: ''
          });
        }

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

  // 获取物品列表（按当前用户的个人进度统计）
  async fetchItems(tripId) {
    try {
      const userId = getCurrentUserId();
      const response = await cooperativeItemApi.listByTrip(tripId, userId);
      if (response.success) {
        const items = response.data || [];
        const trackableItems = items.filter(item => !(item.isTemplateItem === true || item.isTemplateItem === 1));
        const checkedCount = trackableItems.filter(item => item.checkedStatus === 1).length;
        const totalCount = trackableItems.length;
        const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

        this.setData({
          items,
          checkedCount,
          totalItemsCount: totalCount,
          progressPercentage
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
      
      if (parsed && parsed.forecast) {
        parsed.forecast = parsed.forecast.map(day => ({
          ...day,
          formattedDate: this.formatWeatherDate(day.date),
          isInTripRange: this.isDateInTripRange(day.date)
        }));
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

  async loadCityPicture(destination, options = {}) {
    const tripId = this.data.tripId;
    const keyword = extractPrimaryCityName(destination);
    if (!keyword) {
      this.setData({
        cityPictureUrl: '',
        cityPictureList: [],
        pictureError: ''
      });
      return;
    }

    if (!options.force) {
      const cached = getCityPictureCache(destination);
      if (cached && cached.cover) {
        this.setData({
          cityPictureUrl: cached.cover,
          cityPictureList: cached.list || [cached.cover],
          pictureError: '',
          loadingPicture: false
        });
        if (tripId) {
          savePersistedTripCover(tripId, cached.cover);
        }
        return;
      }
    }

    this.setData({
      loadingPicture: true,
      pictureError: '',
      cityPictureUrl: '',
      cityPictureList: []
    });

    try {
      const pictures = await fetchCityPictures(keyword, 6);
      if (pictures && pictures.length > 0) {
        const cached = saveCityPictureCache(destination, pictures) || { cover: pictures[0], list: pictures };
        this.setData({
          cityPictureUrl: cached.cover,
          cityPictureList: cached.list || pictures
        });
        if (tripId) {
          savePersistedTripCover(tripId, cached.cover);
        }
      } else {
        this.setData({
          pictureError: '未找到城市相关图片'
        });
      }
    } catch (error) {
      console.error('行程详情加载城市图片失败:', error);
      this.setData({
        pictureError: '图片获取失败，请重新生成'
      });
    } finally {
      this.setData({
        loadingPicture: false
      });
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

  handleQrImageError() {
    // 静默处理二维码图片加载失败
    try {
      this.setData({
        qrImage: ''
      });
      console.warn('二维码图片加载失败，已清除');
    } catch (error) {
      // 静默失败，不抛出错误
      console.warn('处理二维码图片错误失败:', error);
    }
  },

  changeTripCover() {
    if (!this.ensureCreatorPermission()) return;
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
      const updateResult = await cooperativeTripApi.updateImg(tripId, { img: imageUrl });
      
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
    if (!this.data.isCreator) {
      wx.showToast({
        title: '仅创建人可修改名称',
        icon: 'none'
      });
      return;
    }
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
    const { tripId, editNameValue, isCreator } = this.data;
    if (!tripId) return;
    if (!isCreator) {
      wx.showToast({ title: '仅创建人可修改名称', icon: 'none' });
      return;
    }
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
      const resp = await cooperativeTripApi.rename(tripId, { name });
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

  openInviteDialog() {
    this.setData({ inviteDialogVisible: true });
  },

  closeInviteDialog() {
    this.setData({ inviteDialogVisible: false });
  },

  preventScroll() {},

  ensureCreatorPermission() {
    if (!this.data.isCreator) {
      wx.showToast({
        title: '仅行程创建人可执行邀请操作',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  // 生成6位随机邀请码
  generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  async handleGenerateInviteCode() {
    if (!this.ensureCreatorPermission()) return;
    const { tripId } = this.data;
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ shareLoading: true });
    try {
      // 前端生成邀请码
      const code = this.generateRandomCode();
      const resp = await cooperativeTripApi.generateInviteCode(tripId, userId, code);
      if (resp.success) {
        this.setData({ inviteCode: code });
        if (code) {
          wx.setClipboardData({
            data: code,
            success: () => {
              wx.showToast({ title: '邀请码已复制', icon: 'success' });
            }
          });
        }
      } else {
        wx.showToast({ title: resp.message || '生成失败', icon: 'none' });
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
      wx.showToast({ title: '生成邀请码失败', icon: 'none' });
    } finally {
      this.setData({ shareLoading: false });
    }
  },

  async handleGenerateInviteQr() {
    if (!this.ensureCreatorPermission()) return;
    const { tripId } = this.data;
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      const resp = await cooperativeTripApi.generateInviteQr(tripId, userId);
      if (resp.success) {
        this.setData({
          qrImage: resp.qrImage || '',
          shareToken: resp.token || this.data.shareToken
        });
        wx.showToast({ title: '二维码已生成', icon: 'success' });
      } else {
        wx.showToast({ title: resp.message || '生成失败', icon: 'none' });
      }
    } catch (error) {
      console.error('生成邀请二维码失败:', error);
      wx.showToast({ title: '生成二维码失败', icon: 'none' });
    }
  },

  async handleWechatInvite() {
    if (!this.ensureCreatorPermission()) return;
    const { tripId } = this.data;
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      const resp = await cooperativeTripApi.generateWechatInvite(tripId, userId);
      if (resp.success) {
        this.setData({
          wechatLink: resp.link || '',
          shareToken: resp.token || this.data.shareToken
        });
        wx.showToast({
          title: '邀请链接已生成，可直接分享',
          icon: 'success'
        });
      } else {
        wx.showToast({ title: resp.message || '生成失败', icon: 'none' });
      }
    } catch (error) {
      console.error('生成微信邀请失败:', error);
      wx.showToast({ title: '生成微信邀请失败', icon: 'none' });
    }
  },

  // 查看物品清单
  viewChecklist() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/cooperative-checklist/cooperative-checklist?tripId=${tripId}`
    });
  },

  // 开始查验
  startCheck() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/cooperative-check-process/cooperative-check-process?tripId=${tripId}`
    });
  },

  updateStartCheckAbility(trip) {
    if (!trip) {
      this.setData({ canStartCheck: false });
      return;
    }
    const status = (trip.status || '').toLowerCase();
    const progress = Number(trip.progress || 0);
    const canStart = status !== 'cancelled' && progress < 100;
    this.setData({ canStartCheck: canStart });
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
  },

  onShareAppMessage() {
    const { trip, shareToken, cityPictureUrl } = this.data;
    const token = shareToken ? `?token=${shareToken}` : '';
    return {
      title: `${trip.name || trip.destination || '合作行程'}邀请你加入`,
      path: `/pages/cooperative-join/cooperative-join${token}`,
      imageUrl: cityPictureUrl || ''
    };
  }
});