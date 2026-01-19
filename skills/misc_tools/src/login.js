// pages/login/login.js
const { userApi } = require('../../utils/api.js');
const { saveUser, isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    loading: false,
    isLogging: false,  // 防止重复点击
    agreedToTerms: false,  // 是否同意用户协议和隐私政策
    guestLoading: false  // 游客模式加载状态
  },

  onLoad(options) {
    // 页面加载时检查是否已登录
    if (isLoggedIn()) {
      wx.switchTab({
        url: '/pages/home/home'
      });
    }
  },

  // 协议勾选状态改变
  onAgreementChange(e) {
    this.setData({
      agreedToTerms: e.detail.value.length > 0
    });
  },

  // 查看用户协议
  viewAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 查看隐私政策
  viewPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 微信授权登录
  async handleWechatLogin() {
    // 检查是否同意协议
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 防止重复点击
    if (this.data.isLogging) {
      return;
    }
    
    this.setData({ 
      loading: true,
      isLogging: true
    });

    try {
      // 1. 获取用户信息（需要用户授权）
      const userInfoRes = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        });
      });

      // 检查获取到的用户信息
      console.log('获取到的用户信息:', userInfoRes);
      if (!userInfoRes || !userInfoRes.userInfo) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        this.setData({ loading: false, isLogging: false });
        return;
      }

      

      // 2. 获取微信登录code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        wx.showToast({
          title: '获取登录凭证失败',
          icon: 'none'
        });
        this.setData({ loading: false, isLogging: false });
        return;
      }

      // 3. 获取小程序appId
      let appId = '';
      try {
        const accountInfo = wx.getAccountInfoSync();
        appId = accountInfo && accountInfo.miniProgram ? accountInfo.miniProgram.appId || '' : '';
        console.log('获取到的appId:', appId);
        if (!appId) {
          console.warn('appId为空，可能影响后续功能');
        }
      } catch (error) {
        // 静默处理错误，避免影响登录流程
        console.warn('获取appId失败（不影响登录）:', error);
        // 不显示提示，避免干扰用户体验
      }

      // 4. 调用后端接口进行登录/注册
      // 后端会先检查用户是否存在，如果不存在则先注册，然后再登录
      const loginData = {
        code: loginRes.code,
        appId: appId
      };
      
      console.log('发送给后端的登录数据:', loginData);
      
      const response = await userApi.wechatLogin(loginData);

      if (response.success) {
        // 检查用户状态
        if (response.data && response.data.isStatus === 1) {
          wx.showModal({
            title: '账号被封禁',
            content: '您的账号已被封禁，无法登录',
            showCancel: false,
            confirmText: '知道了'
          });
          this.setData({ loading: false, isLogging: false });
          return;
        }

        // 保存用户信息到本地存储
        saveUser(response.data);
        
        // 根据是否为新用户显示不同的提示
        const isNewUser = response.isNewUser;
        wx.showToast({
          title: isNewUser ? '注册并登录成功' : '登录成功',
          icon: 'success',
          duration: 2000
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 2000);
      } else {
        // 如果是code被使用的错误，提示用户重新登录
        const errorMsg = response.message || '登录失败';
        if (errorMsg.includes('code') || errorMsg.includes('已使用') || errorMsg.includes('过期')) {
          wx.showToast({
            title: '登录凭证已失效，请重试',
            icon: 'none',
            duration: 2000
          });
        } else if (errorMsg.includes('封禁')) {
          wx.showModal({
            title: '账号被封禁',
            content: errorMsg,
            showCancel: false,
            confirmText: '知道了'
          });
        } else {
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      }
    } catch (error) {
      console.error('登录错误:', error);
      if (error.errMsg && error.errMsg.includes('getUserProfile')) {
        // 用户拒绝授权
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '登录失败，请检查网络连接',
          icon: 'none'
        });
      }
    } finally {
      this.setData({ 
        loading: false,
        isLogging: false
      });
    }
  },

  // 游客模式登录
  async handleGuestLogin() {
    // 防止重复点击
    if (this.data.guestLoading) {
      return;
    }
    
    this.setData({ guestLoading: true });

    try {
      const response = await userApi.getGuestUser();

      if (response.success && response.data) {
        // 保存用户信息到本地存储
        saveUser(response.data);
        
        wx.showToast({
          title: '游客模式登录成功',
          icon: 'success',
          duration: 2000
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 2000);
      } else {
        wx.showToast({
          title: response.message || '游客模式登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('游客模式登录错误:', error);
      wx.showToast({
        title: '登录失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ guestLoading: false });
    }
  }
});

