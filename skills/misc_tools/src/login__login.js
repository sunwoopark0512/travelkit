// pages/login/login.js
const { userApi } = require('../../utils/api.js');
const { saveUser } = require('../../utils/auth.js');

Page({
  data: {
    username: '',
    password: '',
    rememberMe: false,
    loading: false
  },

  onLoad(options) {
    // 页面加载时检查是否已登录
    const user = wx.getStorageSync('user');
    if (user) {
      wx.switchTab({
        url: '/pages/home/home'
      });
    }
  },

  // 输入用户名
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 记住我切换
  onRememberMeChange(e) {
    this.setData({
      rememberMe: e.detail.value
    });
  },

  // 处理登录
  async handleLogin() {
    const { username, password } = this.data;

    // 验证输入
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度不能少于6位',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const response = await userApi.login({
        username: username,
        password: password
      });

      if (response.success) {
        // 保存用户信息到本地存储
        saveUser(response.data);
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: response.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      wx.showToast({
        title: '登录失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 微信登录（占位）
  wechatLogin() {
    wx.showToast({
      title: '微信登录功能开发中',
      icon: 'none'
    });
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 忘记密码（占位）
  forgotPassword() {
    wx.showToast({
      title: '忘记密码功能开发中',
      icon: 'none'
    });
  }
});

