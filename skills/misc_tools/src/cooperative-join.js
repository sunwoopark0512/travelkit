const { cooperativeTripApi } = require('../../utils/api-cooperative.js');
const { isLoggedIn, getCurrentUserId } = require('../../utils/auth.js');

Page({
  data: {
    token: '',
    inviteCode: '',
    inviteInfo: null,
    loading: false,
    joinLoading: false,
    errorMessage: ''
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    if (options && options.token) {
      this.setData({ token: options.token });
      this.fetchInvite({ token: options.token });
    }
  },

  onCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  async handlePreviewByCode() {
    const code = (this.data.inviteCode || '').trim();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    this.setData({ token: '' });
    await this.fetchInvite({ code });
  },

  async fetchInvite(params) {
    if (!params || (!params.token && !params.code)) {
      return;
    }
    this.setData({ loading: true, errorMessage: '', inviteInfo: null });
    try {
      const resp = await cooperativeTripApi.previewInvite(params);
      if (resp.success) {
        this.setData({ inviteInfo: resp });
      } else {
        this.setData({ errorMessage: resp.message || '邀请无效或已过期' });
        wx.showToast({ title: resp.message || '邀请无效', icon: 'none' });
      }
    } catch (error) {
      console.error('预览合作邀请失败:', error);
      this.setData({ errorMessage: '查询邀请失败，请稍后重试' });
      wx.showToast({ title: '查询失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async applyJoin() {
    if (!isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const payload = { userId };
    if (this.data.token) {
      payload.token = this.data.token;
    } else if ((this.data.inviteCode || '').trim()) {
      payload.code = this.data.inviteCode.trim();
    } else {
      wx.showToast({ title: '请输入邀请码或扫描二维码', icon: 'none' });
      return;
    }
    this.setData({ joinLoading: true });
    try {
      const resp = await cooperativeTripApi.applyJoin(payload);
      if (resp.success) {
        wx.showToast({ title: '加入成功', icon: 'success' });
        const tripId = resp.tripId;
        setTimeout(() => {
          if (tripId) {
            wx.redirectTo({
              url: `/pages/cooperative-trip-detail/cooperative-trip-detail?id=${tripId}`
            });
          } else {
            wx.switchTab({
              url: '/pages/cooperative-trip-list/cooperative-trip-list'
            });
          }
        }, 1000);
      } else {
        wx.showToast({ title: resp.message || '加入失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加入合作行程失败:', error);
      wx.showToast({ title: '加入失败，请稍后再试', icon: 'none' });
    } finally {
      this.setData({ joinLoading: false });
    }
  }
});

