// pages/statistics/statistics.js
const { tripApi } = require('../../utils/api.js');
const { getCurrentUserId, isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    stats: {
      totalTrips: 0,
      completedTrips: 0,
      totalDays: 0,
      totalItems: 0,
      checkedItems: 0
    },
    loading: false
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.fetchStatistics();
  },

  onShow() {
    if (isLoggedIn()) {
      this.fetchStatistics();
    }
  },

  // 获取统计数据
  async fetchStatistics() {
    const userId = getCurrentUserId() || 1;
    this.setData({ loading: true });

    try {
      const response = await tripApi.getByUserId(userId);
      if (response.success) {
        const trips = response.data || [];
        const stats = {
          totalTrips: trips.length,
          completedTrips: trips.filter(t => t.status === 'completed').length,
          totalDays: trips.reduce((sum, t) => sum + (t.duration || 0), 0),
          totalItems: trips.reduce((sum, t) => sum + (t.totalItems || 0), 0),
          checkedItems: trips.reduce((sum, t) => sum + (t.checkedItems || 0), 0)
        };
        this.setData({ stats });
      } else {
        wx.showToast({
          title: response.message || '获取统计数据失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
      wx.showToast({
        title: '获取统计数据失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});

