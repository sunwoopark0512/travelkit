Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页' },
      { pagePath: '/pages/trip-list/trip-list', text: '行程' },
      { pagePath: '/pages/profile/profile', text: '我的' }
    ],
    icons: {
      /* 使用简化的 SVG utf8 数据 URL，纯填充，不依赖外链资源 */
      home: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5QUEzQUYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNSAyMXYtOGExIDEgMCAwIDAtMS0xaC00YTEgMSAwIDAgMC0xIDF2OCI+PC9wYXRoPjxwYXRoIGQ9Ik0zIDEwYTIgMiAwIDAgMSAuNzA5LTEuNTI4bDctNmEyIDIgMCAwIDEgMi41ODIgMGw3IDZBMiAyIDAgMCAxIDIxIDEwdjlhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJ6Ij48L3BhdGg+PC9zdmc+",
      homeActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMEE1RTIiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNSAyMXYtOGExIDEgMCAwIDAtMS0xaC00YTEgMSAwIDAgMC0xIDF2OCI+PC9wYXRoPjxwYXRoIGQ9Ik0zIDEwYTIgMiAwIDAgMSAuNzA5LTEuNTI4bDctNmEyIDIgMCAwIDEgMi41ODIgMGw3IDZBMiAyIDAgMCAxIDIxIDEwdjlhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJ6Ij48L3BhdGg+PC9zdmc+",
      trip: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5QUEzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTYiIHJ4PSIyIiByeT0iMiIvPjxsaW5lIHgxPSIxNiIgeTE9IjMiIHgyPSIxNiIgeTI9IjciLz48bGluZSB4MT0iOCIgeTE9IjMiIHgyPSI4IiB5Mj0iNyIvPjxsaW5lIHgxPSIzIiB5MT0iMTEiIHgyPSIyMSIgeTI9IjExIi8+PHJlY3QgeD0iNyIgeT0iMTMiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiLz48cmVjdCB4PSIxMyIgeT0iMTMiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiLz48L3N2Zz4=",
      tripActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMEE1RTIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI1IiB3aWR0aD0iMTgiIGhlaWdodD0iMTYiIHJ4PSIyIiByeT0iMiIvPjxsaW5lIHgxPSIxNiIgeTE9IjMiIHgyPSIxNiIgeTI9IjciLz48bGluZSB4MT0iOCIgeTE9IjMiIHgyPSI4IiB5Mj0iNyIvPjxsaW5lIHgxPSIzIiB5MT0iMTEiIHgyPSIyMSIgeTI9IjExIi8+PHJlY3QgeD0iNyIgeT0iMTMiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiLz48cmVjdCB4PSIxMyIgeT0iMTMiIHdpZHRoPSI0IiBoZWlnaHQ9IjMiLz48L3N2Zz4=",
      profile: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5QUEzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiLz48cGF0aCBkPSJNNCwyMGMxLjUtNCAxNC41LTQgMTYgMCIvPjwvc3ZnPg==",
      profileActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMEE1RTIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiLz48cGF0aCBkPSJNNCwyMGMxLjUtNCAxNC41LTQgMTYgMCIvPjwvc3ZnPg=="
    }
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      if (index === this.data.selected) return;
      const url = this.data.list[index].pagePath;
      wx.switchTab({ url });
      this.setData({ selected: index });
    },
    setSelected(index) {
      this.setData({ selected: index });
    }
  }
});
