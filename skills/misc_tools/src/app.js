// app.js
const { isLoggedIn } = require('./utils/auth.js');

App({
  onLaunch() {
    // 检查登录状态，如果未登录则跳转到登录页面
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
    
    // 显式引用 admin 页面路径，避免代码依赖分析忽略
    // 这个条件永远为 false，不会执行，仅用于代码依赖分析识别页面引用
    if (false) {
      wx.navigateTo({ url: '/pages/admin/admin' });
    }
  },
  globalData: {
    userInfo: null
  }
})
