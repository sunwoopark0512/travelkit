Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      try {
        const rect = wx.getMenuButtonBoundingClientRect()
        let platform = 'ios';
        let windowWidth = 375;
        let top = 0;
        
        try {
          const deviceInfo = wx.getDeviceInfo();
          platform = deviceInfo ? deviceInfo.platform : 'ios';
        } catch (e) {
          try {
            const sysInfo = wx.getSystemInfoSync();
            platform = sysInfo ? sysInfo.platform : 'ios';
          } catch (e2) {
            console.warn('获取设备信息失败，使用默认值');
          }
        }
        
        try {
          const windowInfo = wx.getWindowInfo();
          if (windowInfo) {
            windowWidth = windowInfo.windowWidth || 375;
            top = windowInfo.safeArea ? windowInfo.safeArea.top || 0 : 0;
          } else {
            const sysInfo = wx.getSystemInfoSync();
            if (sysInfo) {
              windowWidth = sysInfo.windowWidth || 375;
              top = sysInfo.safeArea ? sysInfo.safeArea.top || 0 : 0;
            }
          }
        } catch (e) {
          console.warn('获取窗口信息失败，使用默认值');
        }
        
        const isAndroid = platform === 'android'
        const isDevtools = platform === 'devtools'
        this.setData({
          ios: !isAndroid,
          innerPaddingRight: `padding-right: ${windowWidth - (rect ? rect.left : 0)}px`,
          leftWidth: `width: ${windowWidth - (rect ? rect.left : 0)}px`,
          safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${top}px); padding-top: ${top}px` : ``
        })
      } catch (error) {
        // 静默处理错误，使用默认值
        console.warn('导航栏初始化失败，使用默认值:', error);
        this.setData({
          ios: true,
          innerPaddingRight: 'padding-right: 0px',
          leftWidth: 'width: 0px',
          safeAreaTop: ''
        });
      }
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'
          };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    }
  },
})
