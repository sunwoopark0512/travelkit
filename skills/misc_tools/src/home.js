// pages/home/home.js
const { tripApi } = require('../../utils/api.js');
const { cooperativeTripApi } = require('../../utils/api-cooperative.js');
const { getCurrentUserId, isLoggedIn, isGuestMode } = require('../../utils/auth.js');

Page({
  data: {
    recentTrips: [],
    recentCooperativeTrips: [],
    loading: false,
    cooperativeLoading: false,
    heroTrip: null,
    heroDaysText: '',
    heroTypeText: '',
    heroImage: '',
    heroShortLine: '',
    heroBottomLine: '',
    homeDefaultImage: '../../homePic/pexels-souvenirpixels-417074_compressed .jpg',
    isGuestMode: false
  },

  onLoad() {
    // 检查登录状态
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
  },

  onShow() {
    // 页面显示时检查登录状态并刷新数据
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    if (this.getTabBar && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    
    // 检查是否为游客模式
    this.setData({
      isGuestMode: isGuestMode()
    });
    
    this.fetchRecentTrips();
    this.fetchRecentCooperativeTrips();
  },

  // 获取最近行程
  async fetchRecentTrips() {
    const userId = getCurrentUserId() || 1;
    this.setData({ loading: true });

    try {
      const response = await tripApi.getRecentTrips(userId, 5);
      if (response.success) {
        const trips = (response.data || []).map(trip => ({
          ...trip,
          coverImage: trip.img || trip.coverImage || trip.imageUrl,
          imageUrl: trip.img || trip.imageUrl || trip.coverImage,
          statusText: this.getStatusText(trip.status),
          typeText: this.getTypeText(trip.type),
          typeEnglish: this.getTypeEnglish(trip.type),
          typeIcon: this.getTypeIcon(trip.type)
        }));
        this.setData({ recentTrips: trips });
        this.computeHeroTrip();
      } else {
        wx.showToast({
          title: response.message || '获取行程失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取最近行程错误:', error);
      wx.showToast({
        title: '获取行程失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 创建新行程
  createTrip() {
    wx.navigateTo({
      url: '/pages/trip-create/trip-create'
    });
  },

  // 查看全部行程
  viewAllTrips() {
    wx.switchTab({
      url: '/pages/trip-list/trip-list'
    });
  },

  // 查看行程详情
  viewTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/trip-detail/trip-detail?id=${tripId}`
    });
  },

  // 开始查验
  checkTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/check-process/check-process?tripId=${tripId}`
    });
  },

  // 查看行程模板
  viewTemplates() {
    wx.navigateTo({
      url: '/pages/trip-templates/trip-templates'
    });
  },

  // 获取最近合作行程
  async fetchRecentCooperativeTrips() {
    const userId = getCurrentUserId() || 1;
    this.setData({ cooperativeLoading: true });

    try {
      const response = await cooperativeTripApi.listByUser(userId);
      if (response.success) {
        const trips = (response.data || []).map(trip => ({
          ...trip,
          coverImage: trip.img || trip.coverImage || trip.imageUrl,
          imageUrl: trip.img || trip.imageUrl || trip.coverImage,
          statusText: this.getStatusText(trip.status),
          typeText: this.getTypeText(trip.type),
          typeEnglish: this.getTypeEnglish(trip.type),
          typeIcon: this.getTypeIcon(trip.type)
        }));
        // 取最近5条
        const recentTrips = trips.slice(0, 5);
        this.setData({
          recentCooperativeTrips: recentTrips
        });
        // 重新计算 Hero 行程（因为合作行程可能更新了）
        this.computeHeroTrip();
      } else {
        console.error('获取合作行程失败:', response.message);
      }
    } catch (error) {
      console.error('获取最近合作行程错误:', error);
    } finally {
      this.setData({ cooperativeLoading: false });
    }
  },

  // 创建合作行程
  createCooperativeTrip() {
    wx.navigateTo({
      url: '/pages/cooperative-trip-create/cooperative-trip-create'
    });
  },

  // 加入行程
  joinCooperativeTrip() {
    wx.navigateTo({
      url: '/pages/cooperative-join/cooperative-join'
    });
  },

  // 查看全部合作行程
  viewAllCooperativeTrips() {
    wx.navigateTo({
      url: '/pages/cooperative-trip-list/cooperative-trip-list'
    });
  },

  // 查看合作行程详情
  viewCooperativeTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/cooperative-trip-detail/cooperative-trip-detail?id=${tripId}`
    });
  },

  // 开始查验合作行程
  checkCooperativeTrip(e) {
    const tripId = Number(e.currentTarget.dataset.id);
    const trip = this.data.recentCooperativeTrips.find(item => item.id === tripId);
    if (trip) {
      if (trip.status === 'cancelled') {
        wx.showToast({ title: '该行程已取消', icon: 'none' });
        return;
      }
      if (Number(trip.progress || 0) >= 100) {
        wx.showToast({ title: '你已完成该行程', icon: 'none' });
        return;
      }
    }
    wx.navigateTo({
      url: `/pages/cooperative-check-process/cooperative-check-process?tripId=${tripId}`
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

  // 获取类型英文标签
  getTypeEnglish(type) {
    const map = {
      tourism: 'TOURISM',
      business: 'BUSINESS',
      family: 'FAMILY',
      other: 'TRIP'
    };
    return map[type] || 'TRIP';
  },

  // 获取类型图标
  getTypeIcon(type) {
    const map = {
      tourism: '🏖️',
      business: '💼',
      family: '🏠',
      other: '🧳'
    };
    return map[type] || '🧳';
  },

  // 计算首页 hero 使用的最近出发行程
  computeHeroTrip() {
    const personalTrips = this.data.recentTrips || [];
    const cooperativeTrips = this.data.recentCooperativeTrips || [];
    
    // 合并所有行程，个人行程标记为 isPersonal: true
    const allTrips = [
      ...personalTrips.map(trip => ({ ...trip, isPersonal: true })),
      ...cooperativeTrips.map(trip => ({ ...trip, isPersonal: false }))
    ];

    if (!allTrips || !allTrips.length) {
      this.setData({
        heroTrip: null,
        heroDaysText: '',
        heroTypeText: '',
        heroImage: '',
        heroShortLine: '',
        heroBottomLine: ''
      });
      return;
    }

    const today = new Date();
    let bestTrip = null;
    let bestDiff = Infinity;
    let bestIsPersonal = false;

    allTrips.forEach(trip => {
      if (!trip.startDate) return;
      // 兼容字符串和 Date 类型的 startDate
      let start = trip.startDate;
      let d;
      if (typeof start === 'string') {
        d = new Date(start.replace(/-/g, '/'));
      } else {
        d = new Date(start);
      }
      if (isNaN(d.getTime())) return;
      const diffDays = Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      
      // 如果日期相同，优先选择个人行程
      if (diffDays >= 0 && diffDays < bestDiff) {
        bestDiff = diffDays;
        bestTrip = trip;
        bestIsPersonal = trip.isPersonal;
      } else if (diffDays >= 0 && diffDays === bestDiff && trip.isPersonal && !bestIsPersonal) {
        // 日期相同但当前是个人行程，优先选择个人行程
        bestTrip = trip;
        bestIsPersonal = true;
      }
    });

    if (!bestTrip) {
      // 如果没有找到未来的行程，选择第一个个人行程
      bestTrip = personalTrips[0] || cooperativeTrips[0] || allTrips[0];
      bestIsPersonal = !!personalTrips[0];
    }

    let heroDaysText = '';
    if (bestDiff > 0 && bestDiff !== Infinity) {
      heroDaysText = `${bestDiff}天后出发`;
    } else if (bestDiff === 0) {
      heroDaysText = '今天出发';
    } else {
      heroDaysText = '近期出行';
    }

    const heroTypeText = this.getTypeText(bestTrip.type);

    // 处理地址：短地址使用最后一段，完整地址用于底部行
    const destination = bestTrip.destination || '';
    let shortLocation = '';
    if (destination) {
      const cleaned = destination.replace(/[,，·]/g, ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      shortLocation = parts.length ? parts[parts.length - 1] : destination;
    }

    const heroShortLine = shortLocation
      ? `${shortLocation} · ${(bestTrip.name || destination || '')}`
      : (bestTrip.name || destination || '');

    const heroBottomLine = destination
      ? `${destination} · ${heroTypeText}`
      : heroTypeText;

    // 封面图
    const heroImage = bestTrip.coverImage || bestTrip.imageUrl || '';

    this.setData({
      heroTrip: bestTrip,
      heroDaysText,
      heroTypeText,
      heroImage,
      heroShortLine,
      heroBottomLine
    });
  },

  onPullDownRefresh() {
    this.fetchRecentTrips();
    this.fetchRecentCooperativeTrips();
    wx.stopPullDownRefresh();
  }
});