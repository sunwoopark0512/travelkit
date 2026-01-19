const { cooperativeTripApi } = require('../../utils/api-cooperative.js');

Component({
  properties: {
    tripId: {
      type: Number,
      value: null
    }
  },
  data: {
    loading: false,
    filter: 'all',
    members: []
  },
  observers: {
    'tripId'(tripId) {
      if (tripId) {
        this.fetchMembers();
      }
    }
  },
  lifetimes: {
    attached() {
      this.fetchMembers();
    }
  },
  methods: {
    async fetchMembers() {
      const { tripId, filter } = this.data;
      if (!tripId) { return; }
      this.setData({ loading: true });
      try {
        const resp = await cooperativeTripApi.getMemberProgress(tripId, filter === 'all' ? '' : filter);
        if (resp.success) {
          const members = (resp.data || []).map(member => {
            const displayName = (member.memberName || '').trim() || `成员${member.userId || ''}`;
            return {
              ...member,
              avatarUrl: member.avatarUrl || '',
              displayInitial: displayName.charAt(0).toUpperCase()
            };
          });
          this.setData({ members });
        }
      } catch (error) {
        console.error('获取成员完成状态失败:', error);
      } finally {
        this.setData({ loading: false });
      }
    },
    onChangeFilter(e) {
      const value = e.currentTarget.dataset.value;
      if (value === this.data.filter) { return; }
      this.setData({ filter: value }, () => this.fetchMembers());
    }
  }
});

