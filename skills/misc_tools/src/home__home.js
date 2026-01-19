// pages/home/home.js
const { tripApi } = require('../../utils/api.js');
const { getCurrentUserId, isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    recentTrips: [],
    loading: false
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
    
    this.fetchRecentTrips();
  },


  // 获取最近行程
  async fetchRecentTrips() {
    const userId = getCurrentUserId() || 1;
    this.setData({ loading: true });

    try {
      const response = await tripApi.getRecentTrips(userId, 5);
      if (response.success) {
        this.setData({
          recentTrips: response.data || []
        });
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
      url: `/pages/checklist/checklist?tripId=${tripId}`
    });
  },

  // 查看行程模板
  viewTemplates() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 查看统计分析
  viewStatistics() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  // 查看个人中心
  viewProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
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

  onPullDownRefresh() {
    this.fetchRecentTrips();
    wx.stopPullDownRefresh();
  }
});

