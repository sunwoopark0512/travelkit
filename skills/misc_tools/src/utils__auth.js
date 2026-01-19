// 用户认证工具函数

const USER_KEY = 'user';
const TOKEN_KEY = 'token';

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  const user = wx.getStorageSync(USER_KEY);
  const token = wx.getStorageSync(TOKEN_KEY);
  return !!(user && token);
}

/**
 * 保存用户信息到本地存储
 * @param {Object} userData 用户数据
 */
function saveUser(userData) {
  if (userData) {
    // 保存用户信息
    wx.setStorageSync(USER_KEY, userData);
    
    // 如果有token，也保存token
    if (userData.token) {
      wx.setStorageSync(TOKEN_KEY, userData.token);
    } else if (userData.id) {
      // 如果没有token，使用用户ID作为临时token
      wx.setStorageSync(TOKEN_KEY, `temp_${userData.id}`);
    }
  }
}

/**
 * 获取当前用户信息
 * @returns {Object|null} 用户信息对象，未登录返回null
 */
function getCurrentUser() {
  const user = wx.getStorageSync(USER_KEY);
  return user || null;
}

/**
 * 获取当前用户ID
 * @returns {number|null} 用户ID，未登录返回null
 */
function getCurrentUserId() {
  const user = getCurrentUser();
  return user ? (user.id || user.userId || null) : null;
}

/**
 * 清除用户信息（退出登录）
 */
function clearUser() {
  wx.removeStorageSync(USER_KEY);
  wx.removeStorageSync(TOKEN_KEY);
}

/**
 * 获取token
 * @returns {string|null} token字符串，未登录返回null
 */
function getToken() {
  return wx.getStorageSync(TOKEN_KEY);
}

/**
 * 检查当前用户是否为游客模式
 * @returns {boolean} 是否为游客模式
 */
function isGuestMode() {
  const user = getCurrentUser();
  if (!user) return false;
  // 检查用户的open_id是否为'userUse'
  return user.open_id === 'userUse' || user.openId === 'userUse';
}

module.exports = {
  isLoggedIn: isLoggedIn,
  saveUser: saveUser,
  getCurrentUser: getCurrentUser,
  getCurrentUserId: getCurrentUserId,
  clearUser: clearUser,
  getToken: getToken,
  isGuestMode: isGuestMode
};

