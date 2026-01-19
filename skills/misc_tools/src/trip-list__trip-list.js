// pages/trip-list/trip-list.js
const { tripApi } = require('../../utils/api.js');
const { getCurrentUserId, isLoggedIn } = require('../../utils/auth.js');

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
      { label: '进行中', value: 'ongoing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
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
    showFilter: false
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
      this.fetchTrips();
    }
  },

  // 获取行程列表
  async fetchTrips() {
    const userId = getCurrentUserId() || 1;
    this.setData({ loading: true });

    try {
      const response = await tripApi.getByUserId(userId);
      if (response.success) {
        const trips = response.data || [];
        // 为每个行程添加状态和类型文本
        const tripsWithText = trips.map(trip => ({
          ...trip,
          statusText: this.getStatusText(trip.status),
          typeText: this.getTypeText(trip.type)
        }));
        this.setData({
          trips: tripsWithText,
          filteredTrips: tripsWithText
        });
        this.applyFilter();
      } else {
        wx.showToast({
          title: response.message || '获取行程列表失败',
          icon: 'none'
        });
      }
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
      typeText: this.getTypeText(trip.type)
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
    this.setData({
      'filterForm.destination': e.detail.value
    });
    this.applyFilter();
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
    const trip = this.data.filteredTrips.find(t => t.id === tripId);
    if (trip && (trip.status === 'completed' || trip.status === 'cancelled')) {
      wx.showToast({
        title: trip.status === 'completed' ? '该行程已完成查验' : '该行程已取消',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: `/pages/checklist/checklist?tripId=${tripId}`
    });
  },

  // 删除行程
  async deleteTrip(e) {
    const tripId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个行程吗？删除后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await tripApi.delete(tripId);
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

  onPullDownRefresh() {
    this.fetchTrips();
    wx.stopPullDownRefresh();
  }
});

