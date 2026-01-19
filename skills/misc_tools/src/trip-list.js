// pages/trip-list/trip-list.js
const { tripApi } = require('../../utils/api.js');
const { cooperativeTripApi } = require('../../utils/api-cooperative.js');
const { getCurrentUserId, isLoggedIn } = require('../../utils/auth.js');
const { fetchCityPictures, extractPrimaryCityName, getCityPictureCache, saveCityPictureCache, getPersistedTripCover, savePersistedTripCover, getTripCoverStorage } = require('../../utils/cityPictureCrawler.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

Page({
  data: {
    trips: [],
    filteredTrips: [],
    filterForm: {
      status: '',
      type: '',
      destination: ''
    },
    statusOptions: [
      { label: '全部状态', value: '' },
      { label: '准备中', value: 'preparing' },
      { label: '已完成', value: 'completed' }
    ],
    typeOptions: [
      { label: '全部类型', value: '' },
      { label: '旅游', value: '旅游' },
      { label: '商务', value: '商务' },
      { label: '探亲', value: '探亲' },
      { label: '其他', value: '其他' }
    ],
    selectedStatusLabel: '全部状态',
    selectedTypeLabel: '全部类型',
    loading: false,
    showFilter: false,
    tripCoverMap: {},
    searchQuery: '',
    stats: {
      readyPercent: 0,
      upcomingCount: 0,
      remainingDays: 0
    }
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.fetchTrips();
  },

  onShow() {
    if (isLoggedIn()) {
      if (this.getTabBar && this.getTabBar()) {
        this.getTabBar().setData({ selected: 1 });
      }
      this.fetchTrips();
    }
  },

  // 获取行程列表
  async fetchTrips() {
    const userId = getCurrentUserId() || 1;
    this.setData({ loading: true });

    try {
      // 同时获取个人行程和合作行程
      const [personalResponse, cooperativeResponse] = await Promise.all([
        tripApi.getByUserId(userId),
        cooperativeTripApi.listByUser(userId)
      ]);

      let allTrips = [];

      // 处理个人行程
      if (personalResponse.success) {
        const personalTrips = (personalResponse.data || []).map(trip => ({
          ...trip,
          isCooperative: false,
          statusText: this.getStatusText(trip.status),
          typeText: this.getTypeText(trip.type),
          typeEnglish: this.getTypeEnglish(trip.type)
        }));
        allTrips = allTrips.concat(personalTrips);
      }

      // 处理合作行程
      if (cooperativeResponse.success) {
        const cooperativeTrips = (cooperativeResponse.data || []).map(trip => ({
          ...trip,
          isCooperative: true,
          statusText: this.getStatusText(trip.status),
          typeText: this.getTypeText(trip.type),
          typeEnglish: this.getTypeEnglish(trip.type)
        }));
        allTrips = allTrips.concat(cooperativeTrips);
      }

      // 标准化进度数据 + 出发倒计时提醒
      allTrips = allTrips.map((trip) => {
        const totalItems = Number(trip.totalItems) || 0;
        let checkedItems = Number(trip.checkedItems) || 0;
        let progressValue = Number(trip.progress) || 0;
        if (totalItems > 0) {
          if (trip.status === 'completed' && checkedItems < totalItems) {
            checkedItems = totalItems;
          }
          progressValue = Math.min(100, Math.round((checkedItems / totalItems) * 100));
        }

        const deadlineInfo = this.computeDeadlineInfo(trip, progressValue);
        const travelers = Number(trip.travelers) || 1;
        const participantAvatars = this.generateParticipantAvatars(travelers);
        
        // 格式化日期显示
        const formattedStartDate = this.formatDateDisplay(trip.startDate);
        const duration = this.calculateDuration(trip.startDate, trip.endDate);
        
        return {
          ...trip,
          totalItems,
          checkedItems,
          progress: progressValue,
          typeIcon: this.getTypeIcon(trip.type),
          participantAvatars: participantAvatars.slice(0, 3),
          participantCount: travelers,
          startDate: formattedStartDate,
          duration: duration,
          ...deadlineInfo
        };
      });

      // 按创建时间倒序排序
      allTrips.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || 0);
        const timeB = new Date(b.createdAt || b.created_at || 0);
        return timeB - timeA;
      });

      // 计算统计数据
      const stats = this.computeStats(allTrips);
      
      this.setData({
        trips: allTrips,
        filteredTrips: allTrips,
        tripCoverMap: getTripCoverStorage(),
        stats: stats
      });
      this.prefetchCityImages(allTrips);
      this.applyFilter();
    } catch (error) {
      console.error('获取行程列表错误:', error);
      wx.showToast({
        title: '获取行程列表失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 应用筛选
  applyFilter() {
    let filtered = this.data.trips.map(trip => ({
      ...trip,
      statusText: this.getStatusText(trip.status),
      typeText: this.getTypeText(trip.type),
      typeEnglish: this.getTypeEnglish(trip.type)
    }));

    if (this.data.filterForm.status) {
      filtered = filtered.filter(trip => trip.status === this.data.filterForm.status);
    }

    if (this.data.filterForm.type) {
      filtered = filtered.filter(trip => trip.type === this.data.filterForm.type);
    }

    if (this.data.filterForm.destination) {
      filtered = filtered.filter(trip => 
        trip.destination && trip.destination.includes(this.data.filterForm.destination)
      );
    }

    // 搜索查询筛选
    if (this.data.searchQuery) {
      const query = this.data.searchQuery.toLowerCase();
      filtered = filtered.filter(trip => 
        (trip.name && trip.name.toLowerCase().includes(query)) ||
        (trip.destination && trip.destination.toLowerCase().includes(query))
      );
    }

    this.setData({ filteredTrips: filtered });
  },

  // 状态筛选
  onStatusChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.statusOptions[index];
    this.setData({
      'filterForm.status': selectedOption ? selectedOption.value : '',
      selectedStatusLabel: selectedOption ? selectedOption.label : '全部状态',
      'filterForm.statusIndex': index
    });
    this.applyFilter();
  },

  // 类型筛选
  onTypeChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.typeOptions[index];
    this.setData({
      'filterForm.type': selectedOption ? selectedOption.value : '',
      selectedTypeLabel: selectedOption ? selectedOption.label : '全部类型',
      'filterForm.typeIndex': index
    });
    this.applyFilter();
  },

  // 目的地搜索
  onDestinationInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      // 清空输入
      this.setData({
        'filterForm.destination': ''
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
      'filterForm.destination': value
    });
    this.applyFilter();
  },

  // 搜索输入
  onSearchInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({
        searchQuery: ''
      });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({
      searchQuery: value
    });
    this.applyFilter();
  },

  // 显示更多选项
  showMore() {
    wx.showActionSheet({
      itemList: ['刷新列表', '查看统计', '设置'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.fetchTrips();
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '统计功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 2) {
          wx.showToast({
            title: '设置功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 显示状态筛选
  showStatusFilter() {
    const statusOptions = this.data.statusOptions.map(opt => opt.label);
    wx.showActionSheet({
      itemList: statusOptions,
      success: (res) => {
        const selectedOption = this.data.statusOptions[res.tapIndex];
        this.setData({
          'filterForm.status': selectedOption ? selectedOption.value : '',
          selectedStatusLabel: selectedOption ? selectedOption.label : '全部状态',
          'filterForm.statusIndex': res.tapIndex
        });
        this.applyFilter();
      }
    });
  },

  // 显示筛选
  showFilter() {
    wx.showActionSheet({
      itemList: ['按日期排序', '按进度排序', '重置筛选'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.sortByDate();
        } else if (res.tapIndex === 1) {
          this.sortByProgress();
        } else if (res.tapIndex === 2) {
          this.resetFilter();
        }
      }
    });
  },

  // 按日期排序
  sortByDate() {
    const trips = [...this.data.filteredTrips];
    trips.sort((a, b) => {
      const dateA = this.parseDate(a.startDate);
      const dateB = this.parseDate(b.startDate);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });
    this.setData({ filteredTrips: trips });
  },

  // 按进度排序
  sortByProgress() {
    const trips = [...this.data.filteredTrips];
    trips.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    this.setData({ filteredTrips: trips });
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      filterForm: {
        status: '',
        type: '',
        destination: '',
        statusIndex: 0,
        typeIndex: 0
      },
      selectedStatusLabel: '全部状态',
      selectedTypeLabel: '全部类型'
    });
    this.applyFilter();
  },

  // 创建行程
  createTrip() {
    wx.navigateTo({
      url: '/pages/trip-create/trip-create'
    });
  },

  // 浏览热门模板
  browseTemplates() {
    wx.navigateTo({
      url: '/pages/trip-templates/trip-templates'
    });
  },


  async prefetchCityImages(trips) {
    if (!Array.isArray(trips) || trips.length === 0) return;
    const persisted = getTripCoverStorage();
    const tripCoverMap = { ...persisted };
    const destinationCache = {};
    for (const trip of trips) {
      const destination = (trip.destination || '').trim();
      if (!destination || tripCoverMap[trip.id]) {
        continue;
      }
      if (destinationCache[destination]) {
        tripCoverMap[trip.id] = destinationCache[destination];
        continue;
      }
      const cached = getCityPictureCache(destination);
      if (cached && cached.cover) {
        destinationCache[destination] = cached.cover;
        tripCoverMap[trip.id] = cached.cover;
        continue;
      }
      const keyword = extractPrimaryCityName(destination);
      if (!keyword) continue;
      try {
        const pictures = await fetchCityPictures(keyword, 1);
        if (pictures && pictures.length > 0) {
          saveCityPictureCache(destination, pictures);
          destinationCache[destination] = pictures[0];
          tripCoverMap[trip.id] = pictures[0];
          savePersistedTripCover(trip.id, pictures[0]);
        }
      } catch (error) {
        console.error('加载行程城市图片失败:', error);
      }
    }
    this.setData({ tripCoverMap });
  },

  // 查看行程详情
  viewTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.filteredTrips.find(t => t.id === tripId);
    if (trip && trip.isCooperative) {
      wx.navigateTo({
        url: `/pages/cooperative-trip-detail/cooperative-trip-detail?id=${tripId}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/trip-detail/trip-detail?id=${tripId}`
      });
    }
  },

  // 开始查验
  checkTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.filteredTrips.find(t => t.id === tripId);
    if (trip && (trip.status === 'completed' || trip.status === 'cancelled')) {
      wx.showToast({
        title: trip.status === 'completed' ? '该行程已完成查验' : '该行程已取消',
        icon: 'none'
      });
      return;
    }
    // 根据行程类型跳转到不同的查验页面
    if (trip && trip.isCooperative) {
      wx.navigateTo({
        url: `/pages/cooperative-check-process/cooperative-check-process?tripId=${tripId}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/check-process/check-process?tripId=${tripId}`
      });
    }
  },

  // 删除行程
  async deleteTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    const trip = this.data.filteredTrips.find(t => t.id === tripId);
    const isCooperative = trip && trip.isCooperative;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个行程吗？删除后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const userId = getCurrentUserId() || 1;
            const response = isCooperative 
              ? await cooperativeTripApi.delete(tripId, userId)
              : await tripApi.delete(tripId);
            if (response.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.fetchTrips();
            } else {
              wx.showToast({
                title: response.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除行程错误:', error);
            wx.showToast({
              title: '删除失败，请检查网络连接',
              icon: 'none'
            });
          }
        }
      }
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

  // 获取类型英文
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

  // 生成参与者头像字母
  generateParticipantAvatars(count) {
    const avatars = [];
    for (let i = 0; i < count; i++) {
      avatars.push(String.fromCharCode(65 + i)); // A, B, C, ...
    }
    return avatars;
  },

  // 计算统计数据
  computeStats(trips) {
    if (!trips || trips.length === 0) {
      return {
        readyPercent: 0,
        upcomingCount: 0,
        remainingDays: 0
      };
    }

    // 准备就绪百分比：已完成查验的行程占比
    const completedTrips = trips.filter(trip => 
      trip.status === 'completed' || (trip.progress >= 100 && trip.status !== 'cancelled')
    );
    const readyPercent = Math.round((completedTrips.length / trips.length) * 100);

    // 即将出发：状态为准备中或进行中，且出发日期在未来7天内
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingTrips = trips.filter(trip => {
      if (trip.status === 'cancelled' || trip.status === 'completed') return false;
      if (!trip.startDate) return false;
      
      const startDate = this.parseDate(trip.startDate);
      if (!startDate) return false;
      
      return startDate >= today && startDate <= sevenDaysLater;
    });
    const upcomingCount = upcomingTrips.length;

    // 剩余天数：最近一个即将出发的行程距离今天的天数
    let remainingDays = 0;
    const futureTrips = trips.filter(trip => {
      if (!trip.startDate) return false;
      const startDate = this.parseDate(trip.startDate);
      if (!startDate) return false;
      return startDate >= today && trip.status !== 'cancelled';
    });

    if (futureTrips.length > 0) {
      futureTrips.sort((a, b) => {
        const dateA = this.parseDate(a.startDate);
        const dateB = this.parseDate(b.startDate);
        return dateA - dateB;
      });
      const nearestTrip = futureTrips[0];
      const nearestDate = this.parseDate(nearestTrip.startDate);
      const diffMs = nearestDate.getTime() - today.getTime();
      remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    }

    return {
      readyPercent,
      upcomingCount,
      remainingDays
    };
  },

  // 解析日期
  parseDate(dateStr) {
    if (!dateStr) return null;
    const match = String(dateStr).replace(/\s/g, '').match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    return date;
  },

  // 格式化日期显示（如：2025,12,8）
  formatDateDisplay(dateStr) {
    if (!dateStr) return '未设置';
    const date = this.parseDate(dateStr);
    if (!date) return dateStr;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year},${month},${day}`;
  },

  // 计算行程天数
  calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    if (!start || !end) return 0;
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1; // 包含首尾两天
    return days > 0 ? days : 0;
  },

  // 计算出发倒计时提醒（仅前端样式使用）
  computeDeadlineInfo(trip, progress) {
    try {
      // 已完成 / 已取消 或 无开始日期时，不提示
      if (!trip || !trip.startDate) {
        return { deadlineStatus: 'normal', deadlineText: '', deadlineDays: null };
      }
      if (trip.status === 'completed' || trip.status === 'cancelled' || Number(progress) >= 100) {
        return { deadlineStatus: 'normal', deadlineText: '', deadlineDays: null };
      }

      const days = this.getDaysUntilStart(trip.startDate);
      if (days == null || days < 1) {
        // 出发当天或已过期不再高亮
        return { deadlineStatus: 'normal', deadlineText: '', deadlineDays: null };
      }

      if (days === 1) {
        return {
          deadlineStatus: 'danger',
          deadlineText: '⚠️ 出发只剩 1 天了，请尽快完成查验',
          deadlineDays: 1
        };
      }

      if (days <= 7) {
        return {
          deadlineStatus: 'warning',
          deadlineText: `⏰ 还有 ${days} 天出发，物品尚未全部完成`,
          deadlineDays: days
        };
      }

      return { deadlineStatus: 'normal', deadlineText: '' };
    } catch (e) {
      return { deadlineStatus: 'normal', deadlineText: '' };
    }
  },

  // 解析开始日期，并计算距离今天还有多少天
  getDaysUntilStart(startDateStr) {
    if (!startDateStr) return null;

    // 支持多种格式，例如：2025-12-03 / 2025,12,3 / 2025.12.3
    const match = String(startDateStr)
      .replace(/\s/g, '')
      .match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!year || !month || !day) return null;

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(year, month - 1, day);

    const diffMs = startDate.getTime() - todayDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Math.round(diffMs / oneDayMs);
  },

  onPullDownRefresh() {
    this.fetchTrips();
    wx.stopPullDownRefresh();
  }
});
