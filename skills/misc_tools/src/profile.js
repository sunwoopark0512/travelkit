// pages/profile/profile.js
const { userApi, pictureCrawlerApi } = require('../../utils/api.js');
const { getCurrentUser, getCurrentUserId, clearUser, isLoggedIn, saveUser, isGuestMode } = require('../../utils/auth.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

Page({
  data: {
    isProfileEditing: false,
    userInfo: {},
    userProfile: {
      name: '',
      gender: '',
      birthday: '', // 用于picker的value，格式：YYYY-MM-DD
      bio: ''
    },
    profileForm: {
      name: '',
      gender: '',
      birthday: '', // 用于picker的value，格式：YYYY-MM-DD
      bio: '',
      identity: ''
    },
    displayBirthday: '', // 用于显示的生日，格式：YYYY-M-D
    constellation: '', // 星座
    loading: false,
    stats: {
      totalTrips: 0,
      completedTrips: 0,
      days: 0
    },
    showPictureDialog: false,
    pictureKeyword: '',
    generatedPictureUrl: '',
    loadingPicture: false,
    maxDate: '', // 最大日期（今天）
    isGuestMode: false,
    // SVG Icons (Base64)
    iconUser: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwZWE1ZTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTkgMjF2LTIYTRhNCA0IDAgMCAwLTQtNEg5YSA0IDQgMCAwIDAtNCA0djIiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiPjwvY2lyY2xlPjwvc3ZnPg==",
    iconPen: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTcgM2EyLjg1IDIuODMgMCAxIDEgNCA0TDcuNSAyMC41IDIgMjJsMS41LTUuNUwxNyAzWiI+PC9wYXRoPjwvc3ZnPg==",
    iconCheck: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiPjwvcG9seWxpbmU+PC9zdmc+",
    iconChevronDown: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiPjwvcGF0aD48L3N2Zz4=",
    // CheckCircle2 Icon (White circle with checkmark)
    iconCheckCircle: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjkgMTIgMTIgMTUgMTUgOCI+PC9wb2x5bGluZT48L3N2Zz4="
  },
  
  // 计算星座
  calculateConstellation(birthday) {
    if (!birthday) return '';
    try {
      const date = new Date(birthday);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      const constellations = [
        { name: '摩羯座', start: [12, 22], end: [1, 19] },
        { name: '水瓶座', start: [1, 20], end: [2, 18] },
        { name: '双鱼座', start: [2, 19], end: [3, 20] },
        { name: '白羊座', start: [3, 21], end: [4, 19] },
        { name: '金牛座', start: [4, 20], end: [5, 20] },
        { name: '双子座', start: [5, 21], end: [6, 21] },
        { name: '巨蟹座', start: [6, 22], end: [7, 22] },
        { name: '狮子座', start: [7, 23], end: [8, 22] },
        { name: '处女座', start: [8, 23], end: [9, 22] },
        { name: '天秤座', start: [9, 23], end: [10, 23] },
        { name: '天蝎座', start: [10, 24], end: [11, 22] },
        { name: '射手座', start: [11, 23], end: [12, 21] }
      ];
      
      for (const constel of constellations) {
        const [startMonth, startDay] = constel.start;
        const [endMonth, endDay] = constel.end;
        
        if (startMonth === endMonth) {
          // 同一个月
          if (month === startMonth && day >= startDay && day <= endDay) {
            return constel.name;
          }
        } else {
          // 跨月（摩羯座）
          if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
            return constel.name;
          }
        }
      }
      return '巨蟹座'; // 默认
    } catch (e) {
      return '巨蟹座';
    }
  },
  
  // 切换编辑模式
  toggleEdit() {
    const newState = !this.data.isProfileEditing;
    this.setData({
      isProfileEditing: newState
    });
    
    if (newState) {
      // 切换到编辑模式时，同步数据到 userProfile
      this.setData({
        userProfile: {
          name: this.data.userInfo.name || '',
          gender: this.data.userInfo.gender || '',
          birthday: this.data.profileForm.birthday || '',
          bio: this.data.userInfo.bio || ''
        }
      });
    }
  },
  
  // 处理姓名输入
  handleNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({
        'userProfile.name': '',
        'profileForm.name': ''
      });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'userProfile.name': value,
      'profileForm.name': value
    });
  },
  
  // 处理简介输入
  handleBioInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({
        'userProfile.bio': '',
        'profileForm.bio': ''
      });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'userProfile.bio': value,
      'profileForm.bio': value
    });
  },
  
  // 处理性别选择
  handleGenderChange(e) {
    const genders = ['男', '女'];
    const selectedGender = genders[e.detail.value];
    this.setData({
      'userProfile.gender': selectedGender,
      'profileForm.gender': selectedGender
    });
  },
  
  // 处理日期选择
  handleDateChange(e) {
    const dateValue = e.detail.value; // 格式：YYYY-MM-DD
    const displayBirthday = this.formatBirthday(dateValue);
    const constellation = this.calculateConstellation(dateValue);
    this.setData({
      'userProfile.birthday': dateValue,
      'profileForm.birthday': dateValue,
      'displayBirthday': displayBirthday,
      constellation: constellation
    });
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    // 检查是否为游客模式
    this.setData({
      isGuestMode: isGuestMode()
    });
    // 设置最大日期为今天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({
      maxDate: `${year}-${month}-${day}`
    });
    this.loadUserInfo();
    this.loadStatistics();
  },

  onShow() {
    if (isLoggedIn()) { 
        // 检查是否为游客模式
      this.setData({
        isGuestMode: isGuestMode()
      });
      if (this.getTabBar && this.getTabBar()) {
        this.getTabBar().setData({ selected: 2 });
      }
      this.loadUserInfo();
      this.loadStatistics();
    }
  },

  // 格式化日期为 YYYY-M-D 格式（月份和日期不补零，用于显示）
  formatBirthday(birthday) {
    if (!birthday) return '';
    
    try {
      let date;
      // 如果是时间戳（数字或字符串数字）
      if (typeof birthday === 'number' || (typeof birthday === 'string' && /^\d+$/.test(birthday))) {
        // 如果是秒级时间戳（10位），转换为毫秒级
        const timestamp = parseInt(birthday);
        date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
      } 
      // 如果是日期字符串（可能是各种格式）
      else if (typeof birthday === 'string') {
        // 尝试处理常见的日期格式
        // 处理 "2025-12-11T00:00:00" 或 "2025-12-11 00:00:00" 或 "2025-12-11" 格式
        const dateStr = birthday.split('T')[0].split(' ')[0];
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
          // 如果已经是日期格式，直接解析
          const parts = dateStr.split('-');
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(birthday);
        }
      } 
      // 如果已经是 Date 对象
      else if (birthday instanceof Date) {
        date = birthday;
      } else {
        console.warn('无法解析的生日格式:', birthday);
        return ''; // 无法解析，返回空字符串
      }
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的生日日期:', birthday);
        return ''; // 无效日期，返回空字符串
      }
      
      // 格式化为 YYYY-M-D（月份和日期不补零）
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 不补零
      const day = date.getDate(); // 不补零
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('格式化生日错误:', error, birthday);
      return ''; // 出错时返回空字符串
    }
  },

  // 将YYYY-M-D格式转换为YYYY-MM-DD格式（用于picker）
  normalizeBirthdayForPicker(birthday) {
    if (!birthday) return '';
    // 如果已经是YYYY-MM-DD格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return birthday;
    }
    // 如果是YYYY-M-D格式，转换为YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(birthday)) {
      const parts = birthday.split('-');
      const year = parts[0];
      const month = String(parseInt(parts[1])).padStart(2, '0');
      const day = String(parseInt(parts[2])).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // 尝试解析其他格式
    try {
      const date = new Date(birthday);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn('无法解析生日格式:', birthday);
    }
    return birthday; // 如果无法解析，返回原始值
  },

  // 加载用户信息
  async loadUserInfo() {
    const user = getCurrentUser();
    const userId = getCurrentUserId();

    if (user) {
      // 处理生日：picker需要YYYY-MM-DD格式，显示需要YYYY-M-D格式
      let pickerBirthday = '';
      let displayBirthday = '';
      let constellation = '';
      if (user.birthday) {
        // 先转换为标准格式用于picker
        pickerBirthday = this.normalizeBirthdayForPicker(user.birthday);
        // 再格式化为显示格式
        displayBirthday = this.formatBirthday(user.birthday);
        // 计算星座
        constellation = this.calculateConstellation(user.birthday);
      }
      // 更新 userInfo 中的 birthday 也为格式化后的值
      const updatedUser = { ...user };
      this.setData({
        userInfo: updatedUser,
        userProfile: {
          name: user.name || '',
          gender: user.gender || '',
          birthday: pickerBirthday,
          bio: user.bio || ''
        },
        profileForm: {
          name: user.name || '',
          gender: user.gender || '',
          birthday: pickerBirthday, // picker需要的格式
          bio: user.bio || ''
        },
        displayBirthday: displayBirthday, // 显示用的格式
        constellation: constellation
      });
    }

    if (userId) {
      try {
        const response = await userApi.getById(userId);
        if (response.success && response.data) {
          const userData = response.data;
          // 处理生日：picker需要YYYY-MM-DD格式，显示需要YYYY-M-D格式
          let pickerBirthday = '';
          let displayBirthday = '';
          let constellation = '';
          if (userData.birthday) {
            // 先转换为标准格式用于picker
            pickerBirthday = this.normalizeBirthdayForPicker(userData.birthday);
            // 再格式化为显示格式
            displayBirthday = this.formatBirthday(userData.birthday);
            // 计算星座
            constellation = this.calculateConstellation(userData.birthday);
          }
          // 更新 userInfo 中的 birthday 也为格式化后的值
          const updatedUserData = { ...userData };
          this.setData({
            userInfo: updatedUserData,
            userProfile: {
              name: userData.name || '',
              gender: userData.gender || '',
              birthday: pickerBirthday,
              bio: userData.bio || ''
            },
            profileForm: {
              name: userData.name || '',
              gender: userData.gender || '',
              birthday: pickerBirthday, // picker需要的格式
              bio: userData.bio || ''
            },
            displayBirthday: displayBirthday, // 显示用的格式
            constellation: constellation
          });
        }
      } catch (error) {
        console.error('获取用户信息错误:', error);
      }
    }
  },

  // 加载统计数据
  async loadStatistics() {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const response = await userApi.getStatistics(userId);
      if (response.success && response.data) {
        this.setData({
          stats: {
            totalTrips: response.data.totalTrips || 0,
            completedTrips: response.data.completedTrips || 0,
            days: response.data.totalDays || 0
          }
        });
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
    }
  },

  // 点击头像
  onAvatarTap() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    wx.showActionSheet({
      itemList: ['从手机相册选择', '拍照', '生成图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImageFromAlbum();
        } else if (res.tapIndex === 1) {
          this.takePhoto();
        } else if (res.tapIndex === 2) {
          this.showPictureDialog();
        }
      }
    });
  },

  // 从手机相册选择
  chooseImageFromAlbum() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.uploadAvatar(res.tempFilePaths[0]);
      }
    });
  },

  // 拍照
  takePhoto() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        this.uploadAvatar(res.tempFilePaths[0]);
      }
    });
  },

  // 上传头像
  async uploadAvatar(filePath) {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({ title: '上传中...' });
    try {
      // 这里需要将图片上传到服务器，暂时先保存本地路径
      // 实际项目中应该调用文件上传API
      const userId = getCurrentUserId();
      if (!userId) {
        wx.showToast({ title: '用户信息错误', icon: 'none' });
        return;
      }

      // 更新用户头像（这里假设filePath可以直接使用，实际需要上传到服务器获取URL）
      const updateData = {
        avatar: filePath // 实际应该是上传后的URL
      };
      
      const response = await userApi.update(userId, updateData);
      if (response.success) {
        wx.hideLoading();
        wx.showToast({ title: '头像更新成功', icon: 'success' });
        this.loadUserInfo();
        // 更新本地存储的用户信息
        const user = getCurrentUser();
        if (user) {
          user.avatar = filePath;
          saveUser(user);
        }
      } else {
        wx.hideLoading();
        wx.showToast({ title: response.message || '更新失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('上传头像错误:', error);
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 显示生成图片对话框
  showPictureDialog() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    this.setData({
      showPictureDialog: true,
      pictureKeyword: '',
      generatedPictureUrl: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 跳转到管理员页面
  goToAdmin() {
    const user = getCurrentUser();
    if (!user || user.identity !== 1) {
      wx.showToast({
        title: '您不是管理员',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/admin/admin',
      success: () => {
        console.log('跳转到管理员页面成功');
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 关闭生成图片对话框
  closePictureDialog() {
    this.setData({
      showPictureDialog: false,
      pictureKeyword: '',
      generatedPictureUrl: ''
    });
  },

  // 输入关键字
  onKeywordInput(e) {
    this.setData({
      pictureKeyword: e.detail.value
    });
  },

  // 生成图片
  async generatePicture() {
    const keyword = this.data.pictureKeyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入关键字', icon: 'none' });
      return;
    }

    this.setData({ loadingPicture: true });
    try {
      const response = await pictureCrawlerApi.search(keyword, 1);
      if (response.success && response.data && response.data.length > 0) {
        this.setData({
          generatedPictureUrl: response.data[0],
          loadingPicture: false
        });
      } else {
        wx.showToast({ title: response.message || '生成失败', icon: 'none' });
        this.setData({ loadingPicture: false });
      }
    } catch (error) {
      console.error('生成图片错误:', error);
      wx.showToast({ title: '生成失败', icon: 'none' });
      this.setData({ loadingPicture: false });
    }
  },

  // 换一张图片
  async changePicture() {
    await this.generatePicture();
  },

  // 确认使用生成的图片
  async confirmPicture() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    const avatarUrl = this.data.generatedPictureUrl;
    if (!avatarUrl) {
      wx.showToast({ title: '请先生成图片', icon: 'none' });
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '用户信息错误', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      const updateData = {
        avatar: avatarUrl
      };
      
      const response = await userApi.update(userId, updateData);
      if (response.success) {
        wx.hideLoading();
        wx.showToast({ title: '头像更新成功', icon: 'success' });
        this.closePictureDialog();
        this.loadUserInfo();
        // 更新本地存储的用户信息
        const user = getCurrentUser();
        if (user) {
          user.avatar = avatarUrl;
          saveUser(user);
        }
      } else {
        wx.hideLoading();
        wx.showToast({ title: response.message || '更新失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更新头像错误:', error);
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  // 输入姓名
  onNameInput(e) {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({
        'profileForm.name': ''
      });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'profileForm.name': value
    });
  },

  // 选择性别
  onGenderChange(e) {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    const genderOptions = ['男', '女'];
    const selectedIndex = parseInt(e.detail.value);
    this.setData({
      'profileForm.gender': genderOptions[selectedIndex]
    });
  },

  // 选择生日
  onBirthdayChange(e) {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    // picker返回的是YYYY-MM-DD格式（补零）
    const dateValue = e.detail.value; // 格式：YYYY-MM-DD
    // 转换为YYYY-M-D格式（不补零）用于显示
    const displayBirthday = this.formatBirthday(dateValue);
    this.setData({
      'profileForm.birthday': dateValue, // picker需要的格式
      'displayBirthday': displayBirthday // 显示用的格式
    });
  },

  // 输入简介
  onBioInput(e) {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({
        'profileForm.bio': ''
      });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      'profileForm.bio': value
    });
  },

  // 保存个人信息
  async saveProfile() {
    // 游客模式不允许修改
    if (isGuestMode()) {
      wx.showToast({
        title: '游客模式不允许修改信息',
        icon: 'none'
      });
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({
        title: '用户信息错误',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 使用 userProfile 的数据（编辑模式下的数据）
      const profileData = { ...this.data.userProfile };
      if (profileData.birthday) {
        // 如果生日是YYYY-M-D格式，转换为YYYY-MM-DD格式
        const parts = profileData.birthday.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = String(parseInt(parts[1])).padStart(2, '0');
          const day = String(parseInt(parts[2])).padStart(2, '0');
          profileData.birthday = `${year}-${month}-${day}`;
        }
      }
      
      const response = await userApi.update(userId, profileData);
      if (response.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        // 退出编辑模式
        this.setData({
          isProfileEditing: false
        });
        this.loadUserInfo();
        // 更新本地存储的用户信息
        const user = getCurrentUser();
        if (user) {
          Object.assign(user, profileData);
          saveUser(user);
        }
      } else {
        wx.showToast({
          title: response.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存用户信息错误:', error);
      wx.showToast({
        title: '保存失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          clearUser();
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});
