// pages/register/register.js
const { userApi } = require('../../utils/api.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

Page({
  data: {
    username: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    agreement: false,
    loading: false,
    codeCountdown: 0
  },

  // 输入用户名
  onUsernameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        username: ''
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
      username: value
    });
  },

  // 输入姓名
  onNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        name: ''
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
      name: value
    });
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 输入邮箱
  onEmailInput(e) {
    this.setData({
      email: e.detail.value
    });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 输入确认密码
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  // 输入验证码
  onVerificationCodeInput(e) {
    this.setData({
      verificationCode: e.detail.value
    });
  },

  // 协议切换
  onAgreementChange(e) {
    this.setData({
      agreement: e.detail.value.length > 0
    });
  },

  // 发送验证码
  sendVerificationCode() {
    const { phone } = this.data;
    
    if (!phone) {
      wx.showToast({
        title: '请先输入手机号',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 模拟发送验证码
    wx.showToast({
      title: '验证码已发送',
      icon: 'success'
    });

    this.setData({ codeCountdown: 60 });
    
    const timer = setInterval(() => {
      const countdown = this.data.codeCountdown - 1;
      this.setData({ codeCountdown: countdown });
      if (countdown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  },

  // 处理注册
  async handleRegister() {
    const { username, name, phone, email, password, confirmPassword, verificationCode, agreement } = this.data;

    // 验证输入
    if (!username || username.length < 2 || username.length > 20) {
      wx.showToast({
        title: '用户名长度为2-20个字符',
        icon: 'none'
      });
      return;
    }

    if (!name || name.length < 2 || name.length > 20) {
      wx.showToast({
        title: '姓名长度为2-20个字符',
        icon: 'none'
      });
      return;
    }

    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone || !phoneReg.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailReg.test(email)) {
      wx.showToast({
        title: '请输入正确的邮箱格式',
        icon: 'none'
      });
      return;
    }

    if (!password || password.length < 6 || password.length > 20) {
      wx.showToast({
        title: '密码长度为6-20个字符',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入密码不一致',
        icon: 'none'
      });
      return;
    }

    if (!verificationCode) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      });
      return;
    }

    // 验证码设为123456
    if (verificationCode !== '123456') {
      wx.showToast({
        title: '验证码错误',
        icon: 'none'
      });
      return;
    }

    if (!agreement) {
      wx.showToast({
        title: '请同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }

    // 检测敏感词
    if (containsSensitiveWord(username)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (containsSensitiveWord(name)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (email && containsSensitiveWord(email)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const response = await userApi.register({
        username: username,
        name: name,
        phone: phone,
        email: email,
        password: password
      });

      if (response.success) {
        wx.showToast({
          title: '注册成功，请登录',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: response.message || '注册失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('注册错误:', error);
      wx.showToast({
        title: '注册失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateBack();
  }
});

