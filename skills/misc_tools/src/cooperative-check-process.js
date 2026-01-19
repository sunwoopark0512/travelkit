const { cooperativeTripApi, cooperativeItemApi } = require('../../utils/api-cooperative.js');
const { isLoggedIn, getCurrentUserId } = require('../../utils/auth.js');

const SOUND_MAP = {
  check: '/music/jeopardy-correct-answer.mp3', // 使用实际存在的文件
  skip: '/music/jeopardy-correct-answer.mp3',
  complete: '/music/result_complete.wav',
  click: '/music/点击音效.mp3'
};

// 🔴 1. 完整分类配置 (完美匹配数据库 10 个分类)
const CATEGORY_CONFIG = {
  // 1. 证件类 (橙色 - 身份证图标)
  '证件类': { 
    color: '#f97316', 
    bg: '#ffedd5',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjk3MzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNNyA4aDEwTTcgMTJoMTAiLz48L3N2Zz4=" 
  },
  
  // 2. 衣物类 (蓝色 - T恤图标)
  '衣物类': { 
    color: '#3b82f6', 
    bg: '#dbeafe',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwLjM4IDMuNGEyIDIgMCAwIDAtMS44LTEuMTFINS40MmEyIDIgMCAwIDAtMS44IDEuMTFsLTEuMzMgMi42OGEyIDIgMCAwIDAgLjg3IDIuNThMNiAxMHYxMGEyIDIgMCAwIDAgMiAyaDhhMiAyIDAgMCAwIDItMlYxMGwyLjg1LTEuMzRhMiAyIDAgMCAwIC44Ny0yLjU4eiIvPjwvc3ZnPg==" 
  },
  
  // 3. 电子设备 (紫色 - 手机图标)
  '电子设备': { 
    color: '#8b5cf6', 
    bg: '#ede9fe',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGI1Y2Y2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNSIgeT0iMiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIwIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTIgMThoLjAxIi8+PC9zdmc+" 
  },
  
  // 4. 洗漱用品 (青色 - 水滴图标)
  '洗漱用品': { 
    color: '#06b6d4', 
    bg: '#cffafe',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDZiNmQ0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyYTcgNyAwIDAgMCA3LTdjMC0yLTEtMy45LTMtNS41cy0zLjUtNC00LTYuNWMtLjUgMi41LTIgNC45LTQgNi41QzYgMTEuMSA1IDEzIDUgMTVhNyA3IDAgMCAwIDcgN3oiLz48L3N2Zz4=" 
  },
  
  // 5. 药品类 (红色 - 急救箱图标)
  '药品类': {
    color: '#ef4444', 
    bg: '#fee2e2',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMiIgeT0iNiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiByeD0iMiIvPjxwYXRoIGQ9Ik0xMiAxMXY0Ii8+PHBhdGggZD0iTTEwIDEzaDQiLz48cGF0aCBkPSJNOCA2VjRhMiAyIDAgMCAxIDItMmgyYTIgMiAwIDAgMSAyIDJ2MiIvPjwvc3ZnPg=="
  },

  // 6. 食品类 (嫩绿色 - 刀叉图标)
  '食品类': {
    color: '#84cc16', // Lime Green
    bg: '#ecfccb',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODRjYzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMnY3YzAgMS4xLjkgMiAyIDJoNGEyIDIgMCAwIDAgMi0yVjIiLz48cGF0aCBkPSJNNCAydjIwIi8+PHBhdGggZD0iTTIxIDE1VjJ2MGE1IDUgMCAwIDAtNSA1djZjMCAxLjEuOSAyIDIgMmgzIi8+PHBhdGggZD0iTTIxIDE1djciLz48L3N2Zz4="
  },

  // 7. 户外用品 (深绿色 - 帐篷图标)
  '户外用品': {
    color: '#15803d', // Forest Green
    bg: '#dcfce7',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTU4MDNkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIgMjFoMjAiLz48cGF0aCBkPSJNNSAyMWE1IDUgMCAwIDEgNiAwIDUgNSAwIDAgMSA2IDAiLz48cGF0aCBkPSJNMTEgMjFMMyA5bDktN2w5IDctOCA5Ii8+PC9zdmc+"
  },

  // 8. 办公用品 (靛蓝色 - 公文包图标)
  '办公用品': {
    color: '#4f46e5', // Indigo
    bg: '#e0e7ff',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGY0NmU1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMiIgeT0iNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTYgMjFWNWEyIDIgMCAwIDAtMi0ySDZhMiAyIDAgMCAwLTIgMnYxNiIvPjwvc3ZnPg=="
  },

  // 9. 安全用品 (琥珀色 - 盾牌图标)
  '安全用品': {
    color: '#f59e0b', // Amber
    bg: '#fef3c7',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyczgtNC4yOCA4LTEwVjVsLTgtNGwtOCA0djdjMCA1LjcyIDggMTAgOCAxMHoiLz48L3N2Zz4="
  },

  // 10. 其他用品 (灰色 - 圆圈图标)
  '其他用品': { 
    color: '#64748b', // Slate
    bg: '#f1f5f9',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMSIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTIiIHI9IjEiLz48Y2lyY2xlIGN4PSI1IiBjeT0iMTIiIHI9IjEiLz48L3N2Zz4=" 
  },

  // 兜底配置 (防止数据库出现未知分类时报错)
  '默认': { 
    color: '#94a3b8', 
    bg: '#f8fafc',
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=" 
  }
};

function getSoundSrc(path) {
  if (!path) return '';
  try {
    // 处理中文路径，确保正确编码
    // 微信小程序中，本地文件路径需要完整路径
    if (path.startsWith('/')) {
      return path; // 已经是绝对路径，直接返回
    }
    // 如果不是绝对路径，添加 / 前缀
    const fullPath = path.startsWith('/') ? path : '/' + path;
    return fullPath;
  } catch (error) {
    console.warn('音效路径编码失败:', path, error);
    return path;
  }
}

Page({
  data: {
    tripId: null,
    trip: {},
    loading: true,
    allItems: [],
    checklist: [], // 所有物品列表（用于显示）
    categories: [], // 分类后的数据
    pendingItems: [],
    checkedItems: [],
    skippedItems: [],
    currentItem: null,
    stats: {
      total: 0,
      checked: 0,
      skipped: 0,
      pending: 0
    },
    progress: 0,
    displayProgress: 12, // 用于控制水位高度，最小12%确保波浪可见
    checkedCount: 0,
    totalCount: 0,
    isAllChecked: false,
    isCompleted: false,
    hasCheckedItems: false,
    statusBarHeight: 44,
    scrollTop: 0, // 保存滚动位置，防止点击后界面跳动
    scrollTopCache: 0, // 缓存滚动位置，用于数据更新后恢复
    processingAction: false,
    currentUserId: null,
    completionHandled: false,
    completionRequesting: false,
    completionConfirming: false
  },
  
  navigateToTripList() {
    this.pendingNavigation = false;
    this.clearNavigationTimer();
    try {
      wx.switchTab({
        url: '/pages/trip-list/trip-list'
      });
    } catch (error) {
      wx.redirectTo({
        url: '/pages/trip-list/trip-list'
      });
    }
  },

  scheduleNavigateAfterSound() {
    this.pendingNavigation = true;
    const player = this.audioPlayers && this.audioPlayers.complete;
    if (player && typeof player.onEnded === 'function') {
      if (typeof player.offEnded === 'function' && this.completionEndedHandler) {
        player.offEnded(this.completionEndedHandler);
      }
      this.completionEndedHandler = () => {
        if (typeof player.offEnded === 'function') {
          player.offEnded(this.completionEndedHandler);
        }
        if (this.pendingNavigation) {
          this.clearNavigationTimer();
          this.navigateToTripList();
        }
      };
      player.onEnded(this.completionEndedHandler);
    }
    this.clearNavigationTimer();
    this.navigationTimer = setTimeout(() => {
      if (this.pendingNavigation) {
        this.navigateToTripList();
      }
    }, 2500);
  },

  clearNavigationTimer() {
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  },

  shouldPromptCompletion(nextStats) {
    const tripStatus = (this.data.trip && this.data.trip.status) || '';
    return nextStats.total > 0
      && nextStats.pending === 0
      && !this.data.completionHandled
      && tripStatus !== 'completed';
  },

  requestCompletionConfirmation() {
    if (this.data.completionRequesting || this.data.completionConfirming) {
      return;
    }
    this.setData({ completionConfirming: true });
    wx.showModal({
      title: '确认完成清单',
      content: '所有物品均已处理，完成后将无法再添加物品或继续查验，是否确认？',
      confirmColor: '#1677ff',
      cancelText: '否',
      confirmText: '是',
      success: (res) => {
        this.setData({ completionConfirming: false });
        if (res.confirm) {
          this.handleConfirmedCompletion();
        }
      },
      fail: () => {
        this.setData({ completionConfirming: false });
      }
    });
  },

  async handleConfirmedCompletion() {
    try {
      await this.finalizeSkippedItems();
      this.completeTrip();
    } catch (error) {
      console.error('同步跳过物品状态失败:', error);
      wx.showToast({
        title: '同步失败，请稍后重试',
        icon: 'none'
      });
    }
  },

  async finalizeSkippedItems() {
    // 跳过物品已经在handleSkipItem中处理，这里不需要额外操作
    return;
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    
    // 获取状态栏高度
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 44
    });
    
    const currentUserId = getCurrentUserId();
    this.setData({ currentUserId: currentUserId || null });
    this.initAudioPlayers();
    const tripId = options?.tripId;
    if (!tripId) {
      wx.showToast({ title: '缺少行程ID', icon: 'none' });
      return;
    }
    this.setData({ tripId });
    this.refreshData();
  },
  
  // 保存滚动位置（优化：只更新缓存，不触发 setData）
  onScroll(e) {
    const scrollTop = e.detail.scrollTop || 0;
    // 只更新缓存，不触发 setData，避免与恢复逻辑冲突
    this.scrollTopCache = scrollTop;
    // 不在这里 setData，让 scroll-view 自然滚动
  },
  
  // 返回
  goBack() {
    wx.navigateBack();
  },

  onShow() {
    if (this.data.tripId) {
      this.refreshData();
    }
  },

  onUnload() {
    this.destroyAudioPlayers();
    this.clearNavigationTimer();
  },

  initAudioPlayers() {
    if (!wx.createInnerAudioContext) {
      console.warn('不支持音频播放');
      this.audioPlayers = {};
      return;
    }
    this.audioPlayers = {};
    Object.keys(SOUND_MAP).forEach((key) => {
      try {
        const ctx = wx.createInnerAudioContext();
        const src = getSoundSrc(SOUND_MAP[key]);
        ctx.src = src;
        ctx.autoplay = false;
        ctx.loop = false;
        ctx.volume = 0.3; // 降低音量，避免太大声
        ctx.obeyMuteSwitch = false;
        ctx.onError((error) => {
          console.warn(`音效 ${key} 加载失败:`, src, error);
        });
        ctx.onCanplay(() => {
          console.log(`音效 ${key} 加载成功:`, src);
        });
        this.audioPlayers[key] = ctx;
      } catch (error) {
        console.warn(`初始化音效 ${key} 失败:`, error);
      }
    });
    console.log('音效播放器初始化完成，共', Object.keys(this.audioPlayers).length, '个');
  },

  destroyAudioPlayers() {
    if (!this.audioPlayers) return;
    Object.values(this.audioPlayers).forEach((ctx) => {
      if (ctx && typeof ctx.destroy === 'function') {
        ctx.stop();
        ctx.destroy();
      }
    });
    this.audioPlayers = null;
    this.completionEndedHandler = null;
  },

  playSound(type) {
    if (!this.audioPlayers) {
      console.warn('音效播放器未初始化');
      return;
    }
    const player = this.audioPlayers[type];
    if (!player) {
      console.warn(`音效播放器不存在: ${type}`);
      return;
    }
    try {
      player.stop();
      player.seek(0); // 重置到开头
      player.play();
      console.log(`播放音效: ${type}`);
    } catch (error) {
      console.warn(`播放音效失败: ${type}`, error);
    }
  },

  async refreshData() {
    this.setData({ loading: true });
    await Promise.all([this.fetchTripDetail(), this.fetchItems()]);
    this.setData({ loading: false });
  },

  async fetchTripDetail() {
    const { tripId } = this.data;
    try {
      const { currentUserId } = this.data;
      const resp = await cooperativeTripApi.getById(tripId, currentUserId);
      if (resp.success) {
        this.setData({ trip: resp.trip || resp.data || {} });
      }
    } catch (error) {
      console.error('获取合作行程详情失败:', error);
    }
  },

  async fetchItems() {
    const { tripId, currentUserId } = this.data;
    try {
      const resp = await cooperativeItemApi.listByTrip(tripId, currentUserId);
      if (resp.success) {
        const items = resp.data || [];
        // 🔴 关键：将 checkedStatus 转换为 checked 字段，适配新的 UI
        // checkedStatus: 1=已携带 -> checked: 1, checkedStatus: 2=已跳过 -> checked: 0, checkedStatus: 0=待查验 -> checked: 0
        const checklist = items.map(item => ({
          ...item,
          checked: item.checkedStatus === 1 ? 1 : 0 // 只有已携带才算 checked=1
        }));
        
        // 根据checkedStatus分类：1=已携带, 2=已跳过, 0或其他=待查验
        const checkedItems = items.filter(item => item.checkedStatus === 1);
        const skippedItems = items.filter(item => item.checkedStatus === 2);
        const pendingItems = items.filter(item => !item.checkedStatus || item.checkedStatus === 0);
        const hasPending = pendingItems.length > 0;
        
        this.setData({
          allItems: items,
          checklist: checklist, // 用于显示和分类
          checkedItems,
          pendingItems,
          currentItem: pendingItems[0] || null,
          skippedItems: skippedItems,
          stats: this.computeStats(items.length, checkedItems.length, skippedItems.length),
          completionHandled: hasPending ? false : this.data.completionHandled
        });
        
        // 更新进度和分类
        this.updateProgress();
      }
    } catch (error) {
      console.error('获取合作行程物品失败:', error);
    }
  },

  computeStats(total, checked, skipped) {
    return {
      total,
      checked,
      skipped,
      pending: Math.max(total - checked - skipped, 0)
    };
  },

  // 切换物品状态（适配新的 UI）
  toggleItem(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.isCompleted) return; // 封箱后不可操作
    
    // 保存当前滚动位置
    const currentScrollTop = this.scrollTopCache || this.data.scrollTop;
    
    const item = this.data.allItems.find(i => i.id === id);
    if (!item) return;
    
    if (item.checkedStatus === 1) {
      // 取消查验（撤回时不播放音效）
      this.handleUncheckItem(item, currentScrollTop);
    } else {
      // 查验（只有查验时才播放音效）
      try {
        this.playSound('click');
      } catch (error) {
        console.warn('播放点击音效失败:', error);
      }
      this.handleCheckItemById(id, currentScrollTop);
    }
  },
  
  // 通过ID查验物品（优化：避免多次 setData）
  async handleCheckItemById(itemId, savedScrollTop) {
    const { currentUserId, tripId, processingAction } = this.data;
    const item = this.data.allItems.find(i => i.id === itemId);
    if (!item || processingAction) return;
    if (!currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    this.setData({ processingAction: true });
    try {
      const resp = await cooperativeItemApi.updateChecked(itemId, { 
        checked: 1, // 已携带
        userId: currentUserId,
        tripId: tripId,
        scope: 'self'
      });
      if (resp.success) {
        // 直接更新数据，不单独 setData，让 updateProgress 统一处理
        const updatedAll = this.data.allItems.map(each => {
          if (each.id === itemId) {
            return { ...each, checkedStatus: 1, checked: 1 };
          }
          return each;
        });
        
        const updatedChecklist = updatedAll.map(item => ({
          ...item,
          checked: item.checkedStatus === 1 ? 1 : 0
        }));
        
        // 先更新数据，但不触发渲染
        this.data.allItems = updatedAll;
        this.data.checklist = updatedChecklist;
        
        // 统一在 updateProgress 中更新所有数据，避免多次渲染
        this.updateProgress(savedScrollTop);
      } else {
        wx.showToast({ title: resp.message || '更新失败', icon: 'none' });
        this.setData({ processingAction: false });
      }
    } catch (error) {
      console.error('合作行程物品查验失败:', error);
      wx.showToast({ title: '更新失败', icon: 'none' });
      this.setData({ processingAction: false });
    }
  },
  
  // 取消查验（优化：避免多次 setData）
  async handleUncheckItem(item, savedScrollTop) {
    const { currentUserId, tripId, processingAction } = this.data;
    if (processingAction) return;
    if (!currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    this.setData({ processingAction: true });
    try {
      // 将 checkedStatus 设为 0（待查验）
      const resp = await cooperativeItemApi.updateChecked(item.id, { 
        checked: 0, // 待查验
        userId: currentUserId,
        tripId: tripId,
        scope: 'self'
      });
      if (resp.success) {
        // 直接更新数据，不单独 setData，让 updateProgress 统一处理
        const updatedAll = this.data.allItems.map(each => {
          if (each.id === item.id) {
            return { ...each, checkedStatus: 0, checked: 0 };
          }
          return each;
        });
        
        const updatedChecklist = updatedAll.map(item => ({
          ...item,
          checked: item.checkedStatus === 1 ? 1 : 0
        }));
        
        // 先更新数据，但不触发渲染
        this.data.allItems = updatedAll;
        this.data.checklist = updatedChecklist;
        
        // 统一在 updateProgress 中更新所有数据，避免多次渲染
        this.updateProgress(savedScrollTop);
      } else {
        wx.showToast({ title: resp.message || '更新失败', icon: 'none' });
        this.setData({ processingAction: false });
      }
    } catch (error) {
      console.error('取消查验失败:', error);
      wx.showToast({ title: '操作失败，请稍后再试', icon: 'none' });
      this.setData({ processingAction: false });
    }
  },
  
  // 更新进度和分类
  updateProgress(savedScrollTop) {
    const list = this.data.checklist || this.data.allItems;
    const checkedCount = list.filter(i => i.checked === 1).length;
    const totalCount = list.length;
    
    // 计算百分比，如果 total 为 0 则为 0
    let progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    
    // 🌊 关键：为了让波浪在底部始终可见，最小高度设为 12%
    const displayProgress = Math.max(12, progress);
    
    // 🔴 关键：在数据更新前，先保存当前滚动位置
    const scrollTopBeforeUpdate = savedScrollTop !== undefined ? savedScrollTop : (this.scrollTopCache || this.data.scrollTop || 0);
    
    // --- 分组逻辑开始 ---
    const uncheckedItems = list.filter(i => i.checked === 0 || !i.checked);
    const groups = {};
    
    uncheckedItems.forEach(item => {
      // 优先使用数据库的 category 字段
      let cat = item.category || '默认';
      
      // 🔴 关键修复：如果数据库返回的是"其他用品"或"默认"，且物品名称明显属于某个分类，
      // 则通过关键词匹配来纠正分类
      const needKeywordMatch = !item.category || item.category === '其他用品' || item.category === '默认';
      
      if (needKeywordMatch) {
        const name = (item.name || '').toLowerCase();
        
        // 1. 证件类（扩展：机票、名片、酒店预订单、旅行保险单等）
        if (name.includes('身份证') || name.includes('护照') || name.includes('签证') || name.includes('证件') || 
            name.includes('登机') || name.includes('机票') || name.includes('飞机票') || name.includes('航班') ||
            name.includes('学生证') || name.includes('老年证') || name.includes('驾驶证') || name.includes('行驶证') ||
            name.includes('名片') || name.includes('工作证') || name.includes('员工证') ||
            name.includes('酒店') || name.includes('预订') || name.includes('预订单') || name.includes('订单') ||
            name.includes('保险') || name.includes('保险单') || name.includes('旅行保险') || name.includes('旅游保险') ||
            name.includes('门票') || name.includes('入场券') || name.includes('车票') || name.includes('火车票') ||
            name.includes('银行卡') || name.includes('信用卡') || name.includes('现金') || name.includes('钱包')) {
          cat = '证件类';
        } 
        // 2. 衣物类（扩展：防晒衣、正装、泳衣等）
        else if (name.includes('衣服') || name.includes('裤子') || name.includes('鞋') || name.includes('帽') || 
                 name.includes('衣物') || name.includes('袜子') || name.includes('内衣') || name.includes('内裤') || 
                 name.includes('T恤') || name.includes('衬衫') || name.includes('外套') || name.includes('夹克') ||
                 name.includes('防晒衣') || name.includes('防晒服') || name.includes('防晒') ||
                 name.includes('正装') || name.includes('西装') || name.includes('礼服') || name.includes('晚礼服') ||
                 name.includes('泳衣') || name.includes('泳装') || name.includes('比基尼') || name.includes('游泳') ||
                 name.includes('裙子') || name.includes('短裤') || name.includes('长裤') || name.includes('牛仔裤') ||
                 name.includes('羽绒服') || name.includes('棉服') || name.includes('毛衣') || name.includes('卫衣')) {
          cat = '衣物类';
        } 
        // 3. 电子设备
        else if (name.includes('手机') || name.includes('充电') || name.includes('电脑') || name.includes('相机') || 
                 name.includes('电子') || name.includes('充电器') || name.includes('充电宝') || name.includes('耳机') || 
                 name.includes('平板') || name.includes('iPad') || name.includes('ipad') || name.includes('笔记本') ||
                 name.includes('数据线') || name.includes('数据') || name.includes('线') || name.includes('插头') ||
                 name.includes('音响') || name.includes('音箱') || name.includes('蓝牙') || name.includes('智能')) {
          cat = '电子设备';
        } 
        // 4. 洗漱用品
        else if (name.includes('牙刷') || name.includes('牙膏') || name.includes('毛巾') || name.includes('洗') || 
                 name.includes('洗漱') || name.includes('沐浴') || name.includes('洗发') || name.includes('水杯') || 
                 name.includes('杯子') || name.includes('漱口') || name.includes('洗面奶') || name.includes('洁面') ||
                 name.includes('香皂') || name.includes('肥皂') || name.includes('沐浴露') || name.includes('洗发水') ||
                 name.includes('护发素') || name.includes('润肤') || name.includes('护肤') || name.includes('面膜')) {
          cat = '洗漱用品';
        } 
        // 5. 药品类
        else if (name.includes('药') || name.includes('创可贴') || name.includes('感冒') || name.includes('退烧') || 
                 name.includes('止痛') || name.includes('维生素') || name.includes('消炎') || name.includes('止泻') ||
                 name.includes('胃药') || name.includes('过敏') || name.includes('眼药') || name.includes('药膏')) {
          cat = '药品类';
        }
        // 6. 食品类（扩展：猕猴桃、蓝莓、百事可乐、巧克力等）
        else if (name.includes('零食') || name.includes('食品') || name.includes('水果') || name.includes('面包') || 
                 name.includes('饼干') || name.includes('饮料') || name.includes('茶') || name.includes('咖啡') || 
                 name.includes('香蕉') || name.includes('苹果') || name.includes('葡萄') || name.includes('橙子') || 
                 name.includes('草莓') || name.includes('西瓜') || name.includes('梨') || name.includes('桃子') ||
                 name.includes('牛奶') || name.includes('酸奶') || name.includes('豆浆') || name.includes('果汁') || 
                 name.includes('水') || name.includes('矿泉水') || name.includes('纯净水') ||
                 name.includes('猕猴桃') || name.includes('奇异果') || name.includes('蓝莓') || name.includes('黑莓') ||
                 name.includes('百事') || name.includes('可乐') || name.includes('雪碧') || name.includes('芬达') ||
                 name.includes('巧克力') || name.includes('糖果') || name.includes('糖') || name.includes('蜜饯') ||
                 name.includes('坚果') || name.includes('瓜子') || name.includes('花生') || name.includes('薯片') ||
                 name.includes('泡面') || name.includes('方便面') || name.includes('火腿') || name.includes('香肠') ||
                 name.includes('蛋糕') || name.includes('点心') || name.includes('月饼') || name.includes('粽子')) {
          cat = '食品类';
        }
        // 7. 户外用品
        else if (name.includes('帐篷') || name.includes('睡袋') || name.includes('登山') || name.includes('户外') || 
                 name.includes('背包') || name.includes('手电') || name.includes('指南针') || name.includes('望远镜') ||
                 name.includes('登山杖') || name.includes('登山鞋') || name.includes('冲锋衣') || name.includes('速干')) {
          cat = '户外用品';
        }
        // 8. 办公用品
        else if (name.includes('笔') || name.includes('本') || name.includes('纸') || name.includes('办公') || 
                 name.includes('文件') || name.includes('文件夹') || name.includes('订书机') || name.includes('胶带') ||
                 name.includes('剪刀') || name.includes('尺子') || name.includes('橡皮') || name.includes('修正带')) {
          cat = '办公用品';
        }
        // 9. 安全用品
        else if (name.includes('安全') || name.includes('锁') || name.includes('防盗') || name.includes('报警') || 
                 name.includes('急救') || name.includes('灭火器') || name.includes('安全绳') || name.includes('安全带')) {
          cat = '安全用品';
        }
        // 10. 其他用品（兜底，如果都不匹配就归到这里）
        else {
          cat = '其他用品';
        }
      }
      
      // 如果分类不在配置中，使用默认配置
      if (!CATEGORY_CONFIG[cat]) {
        cat = '默认';
      }
      
      if (!groups[cat]) {
        groups[cat] = {
          name: cat,
          items: [],
          config: CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['默认']
        };
      }
      groups[cat].items.push(item);
    });
    
    // 将对象转为数组
    const categories = Object.values(groups);
    // --- 分组逻辑结束 ---
    
    const isAllChecked = checkedCount === totalCount && totalCount > 0;
    const hasCheckedItems = checkedCount > 0;
    
    // 🔴 关键优化：统一更新所有数据，包括 allItems 和 checklist，避免多次 setData 导致滚动跳动
    // 注意：不在这里设置 scrollTop，而是在回调中精确恢复
    this.setData({
      allItems: this.data.allItems, // 确保数据同步
      checklist: this.data.checklist, // 确保数据同步
      checkedCount,
      totalCount,
      progress,
      displayProgress, // 用于控制水位高度
      categories, // 设置分组数据
      isAllChecked,
      hasCheckedItems,
      processingAction: false // 重置处理状态
    }, () => {
      // 🔴 关键：数据更新完成后，使用 createSelectorQuery 精确恢复滚动位置
      if (scrollTopBeforeUpdate > 0) {
        this.restoreScrollPositionPrecise(scrollTopBeforeUpdate);
      }
    });
  },
  
  // 精确恢复滚动位置（使用 createSelectorQuery）
  restoreScrollPositionPrecise(targetScrollTop) {
    if (!targetScrollTop || targetScrollTop <= 0) return;
    
    const that = this; // 保存 this 引用
    
    // 使用多层延迟确保 DOM 完全更新
    wx.nextTick(() => {
      setTimeout(() => {
        wx.nextTick(() => {
          // 使用 createSelectorQuery 获取 scroll-view 的实际滚动位置
          const query = wx.createSelectorQuery().in(that);
          query.select('.scroll-area').scrollOffset();
          query.exec((res) => {
            if (res && res[0]) {
              const currentScrollTop = res[0].scrollTop || 0;
              // 如果当前滚动位置与目标不一致，则恢复
              if (Math.abs(currentScrollTop - targetScrollTop) > 5) {
                that.setData({ scrollTop: targetScrollTop });
                // 再次确保设置成功
                setTimeout(() => {
                  that.setData({ scrollTop: targetScrollTop });
                  that.scrollTopCache = targetScrollTop;
                }, 50);
              } else {
                // 如果已经正确，更新缓存
                that.scrollTopCache = targetScrollTop;
              }
            } else {
              // 如果查询失败，直接设置
              that.setData({ scrollTop: targetScrollTop });
              setTimeout(() => {
                that.setData({ scrollTop: targetScrollTop });
                that.scrollTopCache = targetScrollTop;
              }, 50);
            }
          });
        });
      }, 100);
    });
  },
  
  // 恢复滚动位置的辅助方法（优化：使用更可靠的恢复机制）
  restoreScrollPosition(savedScrollTop) {
    if (savedScrollTop === undefined || savedScrollTop === null || savedScrollTop < 0) {
      return;
    }
    
    // 使用多层延迟确保 DOM 完全更新后再恢复滚动位置
    wx.nextTick(() => {
      setTimeout(() => {
        // 再次使用 nextTick 确保渲染完成
        wx.nextTick(() => {
          // 直接设置 scrollTop，不使用 setData，避免触发额外的渲染
          this.setData({ scrollTop: savedScrollTop });
          
          // 额外延迟一次，确保滚动位置设置生效
          setTimeout(() => {
            this.setData({ scrollTop: savedScrollTop });
            // 更新缓存，确保下次恢复时使用正确的值
            this.scrollTopCache = savedScrollTop;
          }, 50);
        });
      }, 100);
    });
  },
  
  async handleCheckItem() {
    const { currentItem, processingAction, currentUserId, tripId } = this.data;
    if (!currentItem || processingAction) return;
    if (!currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ processingAction: true });
    try {
      const resp = await cooperativeItemApi.updateChecked(currentItem.id, { 
        checked: 1, // 已携带
        userId: currentUserId,
        tripId: tripId,
        scope: 'self'
      });
      if (resp.success) {
        this.applyCheckResult(currentItem, 1);
        // 更新进度和分类
        this.updateProgress();
      } else {
        wx.showToast({ title: resp.message || '更新失败', icon: 'none' });
      }
    } catch (error) {
      console.error('合作行程物品查验失败:', error);
      wx.showToast({ title: '更新失败', icon: 'none' });
    } finally {
      this.setData({ processingAction: false });
    }
  },

  applyCheckResult(item, checkedStatus = 1) {
    // checkedStatus: 1=已携带, 2=已跳过
    const isChecked = checkedStatus === 1;
    const updatedAll = this.data.allItems.map(each => 
      each.id === item.id ? { ...each, checked: isChecked, checkedStatus: checkedStatus } : each
    );
    
    // 更新 checklist（用于显示和分类）
    const updatedChecklist = updatedAll.map(item => ({
      ...item,
      checked: item.checkedStatus === 1 ? 1 : 0
    }));
    
    const remainingPending = this.data.pendingItems.filter(p => p.id !== item.id);
    
    let updatedChecked, updatedSkipped;
    if (checkedStatus === 1) {
      // 已携带
      updatedChecked = [...this.data.checkedItems, { ...item, checked: true, checkedStatus: 1 }];
      updatedSkipped = this.data.skippedItems;
    } else {
      // 已跳过
      updatedChecked = this.data.checkedItems;
      updatedSkipped = [...this.data.skippedItems, { ...item, checked: false, checkedStatus: 2 }];
    }
    
    const nextItem = remainingPending[0] || null;
    const nextStats = this.computeStats(updatedAll.length, updatedChecked.length, updatedSkipped.length);
    
    const shouldAutoComplete = this.shouldPromptCompletion(nextStats);
    
    this.setData({
      allItems: updatedAll,
      checklist: updatedChecklist,
      checkedItems: updatedChecked,
      skippedItems: updatedSkipped,
      pendingItems: remainingPending,
      currentItem: nextItem,
      stats: nextStats
    }, () => {
      // 更新进度和分类
      this.updateProgress();
      
      if (shouldAutoComplete) {
        this.requestCompletionConfirmation();
      }
    });
  },

  async completeTrip() {
    const { tripId, currentUserId, completionRequesting, completionHandled } = this.data;
    if (!tripId || !currentUserId || completionRequesting || completionHandled) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      this.setData({ completionRequesting: true });
      wx.showLoading({ title: '提交中...', mask: true });
      const resp = await cooperativeTripApi.complete(tripId, currentUserId);
      wx.hideLoading();
      if (resp.success) {
        this.playSound('complete');
        wx.showToast({
          title: resp.message || '行程已完成',
          icon: 'success',
          duration: 800
        });
        this.persistChecklistLock(tripId, currentUserId);
        const updatedTrip = resp.trip || this.data.trip || {};
        const mergedTrip = {
          ...(this.data.trip || {}),
          ...updatedTrip
        };
        if (resp.status) {
          mergedTrip.status = resp.status;
        }
        this.setData({
          trip: mergedTrip,
          isCompleted: true,
          completionHandled: true,
          completionRequesting: false
        });
        // 更新进度（显示100%水位）
        this.updateProgress();
        // 不自动跳转，让用户看到封箱效果
        // this.scheduleNavigateAfterSound();
      } else {
        wx.showToast({ title: resp.message || '完成失败', icon: 'none' });
        this.setData({ completionHandled: false, completionRequesting: false });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('合作行程完成失败:', error);
      wx.showToast({ title: '完成失败，请稍后再试', icon: 'none' });
      this.setData({ completionHandled: false, completionRequesting: false });
    }
  },
  
  // 重新激活清单
  reactivateTrip() {
    this.setData({ isCompleted: false });
    // 可以调用API更新状态
    this.updateProgress();
  },

  async handleSkipItem() {
    const { currentItem, pendingItems, skippedItems, processingAction, currentUserId, tripId } = this.data;
    if (!currentItem || processingAction) return;
    if (!currentUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ processingAction: true });
    try {
      const resp = await cooperativeItemApi.updateChecked(currentItem.id, { 
        checked: 2, // 已跳过
        userId: currentUserId,
        tripId: tripId,
        scope: 'self'
      });
      if (resp.success) {
        this.playSound('skip');
        this.applyCheckResult(currentItem, 2);
        // updateProgress 已在 applyCheckResult 的回调中调用
      } else {
        wx.showToast({ title: resp.message || '更新失败', icon: 'none' });
      }
    } catch (error) {
      console.error('合作行程物品跳过失败:', error);
      wx.showToast({ title: '更新失败', icon: 'none' });
    } finally {
      this.setData({ processingAction: false });
    }
  },

  handleResumeSkipped() {
    const { skippedItems, pendingItems } = this.data;
    if (!skippedItems.length) return;
    const merged = [...pendingItems, ...skippedItems];
    this.setData({
      pendingItems: merged,
      skippedItems: [],
      currentItem: merged[0] || null,
      stats: this.computeStats(this.data.allItems.length, this.data.checkedItems.length, 0)
    });
  },

  viewChecklist() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/cooperative-checklist/cooperative-checklist?tripId=${tripId}`
    });
  },

  viewTripDetail() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/cooperative-trip-detail/cooperative-trip-detail?id=${tripId}`
    });
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => wx.stopPullDownRefresh());
  },

  persistChecklistLock(tripId, userId) {
    if (!tripId || !userId) {
      return;
    }
    try {
      const lockKey = `${tripId}_${userId}`;
      const locks = wx.getStorageSync('coopChecklistLocks') || {};
      locks[lockKey] = true;
      wx.setStorageSync('coopChecklistLocks', locks);
    } catch (error) {
      console.warn('保存合作清单锁定状态失败:', error);
    }
  },

  async removeCheckRecord(e) {
    const itemId = e.currentTarget.dataset.id;
    const { currentUserId } = this.data;
    if (!itemId || !currentUserId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    try {
      const resp = await cooperativeItemApi.deleteCheckRecord(itemId, currentUserId);
      if (resp.success) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        // 刷新数据
        await this.fetchItems();
      } else {
        wx.showToast({ title: resp.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('删除查验记录失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});

