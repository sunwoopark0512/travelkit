// pages/trip-detail/trip-detail.js
const { tripApi, itemApi, checkApi, checkTestApi } = require('../../utils/api.js');
const { isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    tripId: null,
    trip: {},
    items: [],
    checkedCount: 0,
    totalItemsCount: 0,
    progressPercentage: 0,
    loading: false,
    // 天气相关
    weatherForecast30d: null,
    loadingWeather: false,
    weatherError: null
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const tripId = options.id;
    if (tripId) {
      this.setData({ tripId: tripId });
      this.fetchTripDetail(tripId);
      this.fetchItems(tripId);
    }
  },

  // 获取行程详情
  async fetchTripDetail(tripId) {
    this.setData({ loading: true });

    try {
      const response = await tripApi.getById(tripId);
      if (response.success) {
        const trip = response.data || {};
        this.setData({
          trip: trip
        });

        // 如果有locationId和日期，加载天气信息
        if (trip.locationId && trip.startDate && trip.endDate) {
          await this.loadWeather30Days(trip.locationId, trip.destination);
        }
      } else {
        wx.showToast({
          title: response.message || '获取行程详情失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取行程详情错误:', error);
      wx.showToast({
        title: '获取行程详情失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取物品列表
  async fetchItems(tripId) {
    try {
      const response = await itemApi.getByTripId(tripId);
      if (response.success) {
        const items = response.data || [];
        const checkedCount = items.filter(item => item.checked).length;
        const totalCount = items.length;
        const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

        this.setData({
          items: items,
          checkedCount: checkedCount,
          totalItemsCount: totalCount,
          progressPercentage: progressPercentage
        });
      }
    } catch (error) {
      console.error('获取物品列表错误:', error);
    }
  },

  // 加载30天天气预报
  async loadWeather30Days(locationId, cityName) {
    if (!locationId) {
      return;
    }

    this.setData({
      loadingWeather: true,
      weatherError: null,
      weatherForecast30d: null
    });

    try {
      const resp = await checkTestApi.getWeather30d(locationId);
      const parsed = this.parseHe30d(resp, cityName || '未知城市');
      
      // 格式化日期并为每个天气项添加格式化后的日期和是否在行程范围内的标记
      if (parsed && parsed.forecast) {
        parsed.forecast = parsed.forecast.map(day => {
          return {
            ...day,
            formattedDate: this.formatWeatherDate(day.date),
            isInTripRange: this.isDateInTripRange(day.date)
          };
        });
      }
      
      this.setData({
        weatherForecast30d: parsed
      });

      if (parsed.hasError) {
        this.setData({
          weatherError: parsed.errorMessage || '获取天气失败'
        });
      }
    } catch (error) {
      console.error('获取30天天气预报失败:', error);
      this.setData({
        weatherError: '获取天气失败: ' + (error?.message || error),
        weatherForecast30d: null
      });
    } finally {
      this.setData({ loadingWeather: false });
    }
  },

  // 解析30天天气预报数据
  parseHe30d(payload, cityName) {
    let data;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch {
        data = {};
      }
    } else {
      data = payload;
    }
    const ok = data && (data.code === '200' || data.code === 200);
    const daily = ok && Array.isArray(data.daily) ? data.daily : [];
    return {
      city: cityName,
      hasError: !ok,
      errorMessage: ok ? '' : (data?.message || '获取30天预报失败'),
      forecast: daily.map(d => ({
        date: d.fxDate,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        textDay: d.textDay,
        textNight: d.textNight,
        iconDay: d.iconDay ? `https://icons.qweather.com/assets/icons/${d.iconDay}.svg` : '',
        iconNight: d.iconNight ? `https://icons.qweather.com/assets/icons/${d.iconNight}.svg` : ''
      }))
    };
  },

  // 格式化天气日期（返回格式化后的字符串）
  formatWeatherDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      
      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '明天';
      } else if (diffDays === 2) {
        return '后天';
      } else {
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();
        const weekday = weekdays[targetDate.getDay()];
        return `${month}/${day} ${weekday}`;
      }
    } catch {
      return '';
    }
  },

  // 判断日期是否在行程日期范围内
  isDateInTripRange(dateStr) {
    const { trip } = this.data;
    if (!trip.startDate || !trip.endDate || !dateStr) {
      return false;
    }
    try {
      const checkDate = new Date(dateStr);
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      
      checkDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    } catch {
      return false;
    }
  },

  // 查看物品清单
  viewChecklist() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/checklist/checklist?tripId=${tripId}`
    });
  },

  // 开始查验
  startCheck() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/check-process/check-process?tripId=${tripId}`
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
  }
});
