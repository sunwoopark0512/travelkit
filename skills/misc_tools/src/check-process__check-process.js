// pages/check-process/check-process.js
const { itemApi, tripApi, checkHistoryApi, checkApi } = require('../../utils/api.js');
const { isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    tripId: null,
    trip: {},
    items: [],
    checkHistories: [],
    // 查验模式
    isCheckingMode: true,
    currentCheckMode: 'manual', // manual, photo, voice
    currentCheckItem: null,
    checkedItemsList: [],
    skippedItemsList: [],
    // 统计数据
    checkedCount: 0,
    skippedCount: 0,
    pendingCount: 0,
    totalItemsCount: 0,
    progressPercentage: 0,
    // 状态
    loading: false,
    // 照片上传
    uploadedPhoto: null,
    // 语音录制
    isRecording: false,
    voiceResult: null,
    // checkbox状态
    checkboxChecked: false,
    checkboxKey: 0 // 用于强制重新渲染checkbox
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const tripId = options.tripId;
    if (tripId) {
      this.setData({ tripId: tripId });
      this.fetchTripDetail(tripId);
      this.fetchItems(tripId);
      this.fetchCheckHistories(tripId);
    }
  },

  // 获取行程详情
  async fetchTripDetail(tripId) {
    try {
      const response = await tripApi.getById(tripId);
      if (response.success) {
        this.setData({
          trip: response.data || {}
        });
      }
    } catch (error) {
      console.error('获取行程详情错误:', error);
    }
  },

  // 获取物品列表
  async fetchItems(tripId) {
    this.setData({ loading: true });

    try {
      const response = await itemApi.getByTripId(tripId);
      if (response.success) {
        const items = response.data || [];
        this.setData({
          items: items
        });
        this.updateCheckStatistics();
        this.findCurrentCheckItem();
      }
    } catch (error) {
      console.error('获取物品列表错误:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取查验历史
  async fetchCheckHistories(tripId) {
    try {
      const response = await checkHistoryApi.getByTripId(tripId);
      if (response && response.success) {
        this.setData({
          checkHistories: response.data || []
        });
        this.updateCheckStatistics();
        this.findCurrentCheckItem();
      }
    } catch (error) {
      console.error('获取查验历史错误:', error);
    }
  },

  // 更新查验统计
  updateCheckStatistics() {
    const { items, checkHistories } = this.data;
    
    // 构建最新操作映射
    const latestActionMap = {};
    checkHistories.forEach(h => {
      if (h && h.itemId) {
        latestActionMap[h.itemId] = h.action;
      }
    });

    const checkedCount = items.filter(item => latestActionMap[item.id] === 'checked').length;
    const skippedCount = items.filter(item => latestActionMap[item.id] === 'skipped').length;
    const totalItemsCount = items.length;
    const pendingCount = Math.max(totalItemsCount - checkedCount - skippedCount, 0);
    const progressPercentage = totalItemsCount > 0 ? Math.round((checkedCount / totalItemsCount) * 100) : 0;

    // 构建已查验和已跳过列表
    const checkedItemsList = items.filter(item => latestActionMap[item.id] === 'checked').map(item => ({
      ...item,
      skipped: false
    }));

    const skippedItemsList = items.filter(item => latestActionMap[item.id] === 'skipped').map(item => ({
      ...item,
      skipped: true
    }));

    this.setData({
      checkedCount: checkedCount,
      skippedCount: skippedCount,
      pendingCount: pendingCount,
      totalItemsCount: totalItemsCount,
      progressPercentage: progressPercentage,
      checkedItemsList: checkedItemsList,
      skippedItemsList: skippedItemsList
    });
  },

  // 查找当前要查验的物品
  findCurrentCheckItem() {
    const { items, checkHistories } = this.data;
    
    // 构建最新操作映射
    const latestActionMap = {};
    checkHistories.forEach(h => {
      if (h && h.itemId) {
        latestActionMap[h.itemId] = h.action;
      }
    });

    // 找到第一个没有被标记为 'checked' 或 'skipped' 的物品
    const currentItem = items.find(item => {
      const action = latestActionMap[item.id];
      return !action || (action !== 'checked' && action !== 'skipped');
    });

    // 重置checkbox状态和key，确保checkbox未选中
    const newCheckboxKey = this.data.checkboxKey + 1;
    this.setData({
      currentCheckItem: currentItem || null,
      checkboxChecked: false,
      checkboxKey: newCheckboxKey,
      uploadedPhoto: null,
      voiceResult: null,
      isRecording: false
    });
  },

  // 开始查验模式
  async startCheckMode() {
    const { tripId } = this.data;
    try {
      const response = await checkApi.startCheck(tripId);
      if (response.success) {
        this.setData({ isCheckingMode: true });
        wx.showToast({
          title: '开始查验',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('开始查验错误:', error);
      wx.showToast({
        title: '开始查验失败',
        icon: 'none'
      });
    }
  },

  // 暂停查验模式
  async pauseCheckMode() {
    const { tripId } = this.data;
    try {
      const response = await checkApi.pauseCheck(tripId);
      if (response.success) {
        this.setData({ isCheckingMode: false });
        wx.showToast({
          title: '已暂停查验',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('暂停查验错误:', error);
      wx.showToast({
        title: '暂停查验失败',
        icon: 'none'
      });
    }
  },

  // 完成查验模式
  async completeCheckMode() {
    const { tripId } = this.data;
    
    wx.showModal({
      title: '确认完成',
      content: '确定要完成查验吗？完成后将无法继续查验。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await checkApi.completeCheck(tripId);
            if (response.success) {
              this.setData({ isCheckingMode: false });
              wx.showToast({
                title: '查验完成',
                icon: 'success'
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          } catch (error) {
            console.error('完成查验错误:', error);
            wx.showToast({
              title: '完成查验失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 切换查验模式
  switchCheckMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const modeText = {
      'manual': '逐项勾选',
      'photo': '拍照验证',
      'voice': '语音确认'
    };
    // 切换模式时重置checkbox状态
    const newCheckboxKey = this.data.checkboxKey + 1;
    this.setData({ 
      currentCheckMode: mode,
      checkboxChecked: false,
      checkboxKey: newCheckboxKey,
      uploadedPhoto: null,
      voiceResult: null,
      isRecording: false
    });
    wx.showToast({
      title: `已切换到${modeText[mode]}模式`,
      icon: 'none'
    });
  },

  // 处理checkbox变化（逐项勾选模式）
  async handleCheckboxChange(e) {
    const checked = e.detail.value.length > 0;
    if (!checked) {
      // 如果取消勾选，重置checkbox状态
      this.setData({
        checkboxChecked: false
      });
      return;
    }

    const { currentCheckItem, tripId, currentCheckMode } = this.data;
    if (!currentCheckItem) return;

    // 检查当前物品是否已经查验过
    const { checkHistories } = this.data;
    const latestActionMap = {};
    checkHistories.forEach(h => {
      if (h && h.itemId) {
        latestActionMap[h.itemId] = h.action;
      }
    });

    const currentAction = latestActionMap[currentCheckItem.id];
    if (currentAction === 'checked' || currentAction === 'skipped') {
      // 如果已经查验过，重置checkbox状态
      this.setData({
        checkboxChecked: false
      });
      wx.showToast({
        title: '该物品已经查验过了',
        icon: 'none'
      });
      return;
    }

    // 设置checkbox为选中状态
    this.setData({
      checkboxChecked: true
    });

    try {
      // 更新物品状态
      const response = await itemApi.updateCheckedStatus(currentCheckItem.id, true);
      if (response.success) {
        // 记录查验历史
        await checkApi.updateCheckProgress(tripId, {
          itemId: currentCheckItem.id,
          action: 'checked',
          checkMode: currentCheckMode,
          note: `${currentCheckItem.name} 已查验`
        });
        
        // 刷新数据（会自动切换到下一个物品，并重置checkbox状态）
        await this.fetchItems(tripId);
        await this.fetchCheckHistories(tripId);
        
        wx.showToast({
          title: `${currentCheckItem.name} 已查验`,
          icon: 'success'
        });
      } else {
        // 如果更新失败，重置checkbox状态
        this.setData({
          checkboxChecked: false
        });
      }
    } catch (error) {
      console.error('更新物品状态错误:', error);
      // 如果出错，重置checkbox状态
      this.setData({
        checkboxChecked: false
      });
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  // 跳过当前物品
  async skipCurrentItem() {
    const { currentCheckItem, tripId, currentCheckMode } = this.data;
    if (!currentCheckItem) return;

    // 重置checkbox状态
    this.setData({
      checkboxChecked: false
    });

    try {
      // 记录查验历史（标记为跳过）
      await checkApi.updateCheckProgress(tripId, {
        itemId: currentCheckItem.id,
        action: 'skipped',
        checkMode: currentCheckMode,
        note: `${currentCheckItem.name} 已跳过`
      });
      
      // 刷新数据（会自动切换到下一个物品，并重置checkbox状态）
      await this.fetchItems(tripId);
      await this.fetchCheckHistories(tripId);
      
      wx.showToast({
        title: `${currentCheckItem.name} 已跳过`,
        icon: 'none'
      });
    } catch (error) {
      console.error('跳过物品错误:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 选择照片（拍照验证模式）
  choosePhoto() {
    const { currentCheckItem } = this.data;
    if (!currentCheckItem) {
      wx.showToast({
        title: '当前没有待查验物品',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          uploadedPhoto: tempFilePath
        });
        wx.showToast({
          title: '照片选择成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('选择照片失败:', err);
        wx.showToast({
          title: '选择照片失败',
          icon: 'none'
        });
      }
    });
  },

  // 确认照片查验
  async confirmPhotoCheck() {
    const { uploadedPhoto } = this.data;
    if (!uploadedPhoto) {
      wx.showToast({
        title: '请先选择照片',
        icon: 'none'
      });
      return;
    }

    // 执行查验
    await this.handleCheckboxChange({ detail: { value: ['checked'] } });
    this.setData({ uploadedPhoto: null });
  },

  // 重新拍照
  retakePhoto() {
    this.setData({ uploadedPhoto: null });
  },

  // 切换录音（语音确认模式）
  toggleRecording() {
    const { currentCheckItem, isRecording } = this.data;
    if (!currentCheckItem) {
      wx.showToast({
        title: '当前没有待查验物品',
        icon: 'none'
      });
      return;
    }

    if (isRecording) {
      // 停止录音
      this.setData({ isRecording: false });
      // 模拟语音识别结果
      this.setData({
        voiceResult: `我已携带${currentCheckItem.name}`
      });
      wx.showToast({
        title: '语音识别成功',
        icon: 'success'
      });
    } else {
      // 开始录音
      this.setData({ isRecording: true });
      wx.showToast({
        title: '开始录音，请说出物品名称',
        icon: 'none'
      });
    }
  },

  // 确认语音查验
  async confirmVoiceCheck() {
    const { voiceResult } = this.data;
    if (!voiceResult) {
      wx.showToast({
        title: '请先进行语音确认',
        icon: 'none'
      });
      return;
    }

    // 执行查验
    await this.handleCheckboxChange({ detail: { value: ['checked'] } });
    this.setData({ voiceResult: null, isRecording: false });
  },

  // 重新录音
  retryVoice() {
    this.setData({ voiceResult: null, isRecording: false });
  },

  // 删除查验记录
  async removeCheckRecord(e) {
    const itemId = e.currentTarget.dataset.id;
    const { tripId } = this.data;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个查验记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await itemApi.removeCheckRecord(tripId, itemId);
            if (response.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              await this.fetchItems(tripId);
              await this.fetchCheckHistories(tripId);
            }
          } catch (error) {
            console.error('删除查验记录错误:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 退出查验模式
  exitCheckMode() {
    wx.navigateBack();
  },

  // 获取分类文本
  getCategoryText(category) {
    const map = {
      'DOCUMENTS': '证件类',
      'CLOTHING': '衣物类',
      'ELECTRONICS': '电子设备',
      'TOILETRIES': '洗漱用品',
      'MEDICINE': '药品类',
      'FOOD': '食品类',
      'OUTDOOR': '户外用品',
      'OFFICE': '办公用品',
      'SAFETY': '安全用品',
      'OTHERS': '其他用品'
    };
    
    if (typeof category === 'number') {
      const codeMap = {
        1: 'DOCUMENTS',
        2: 'CLOTHING',
        3: 'ELECTRONICS',
        4: 'TOILETRIES',
        5: 'MEDICINE',
        6: 'FOOD',
        7: 'OUTDOOR',
        8: 'OFFICE',
        9: 'SAFETY',
        10: 'OTHERS'
      };
      category = codeMap[category] || 'OTHERS';
    }
    
    return map[category] || category || '其他';
  }
});

