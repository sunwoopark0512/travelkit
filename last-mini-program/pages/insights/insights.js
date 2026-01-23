import { insightsApi } from '../../utils/insightsApi';

Page({
    data: {
        targetUrl: '',
        loading: false,
        jobs: [],
        showDashboard: false,
        dashboard: null,
        userId: 1001 // Fixed for demo
    },

    onShow() {
        this.loadJobs();
    },

    onUrlInput(e) {
        this.setData({ targetUrl: e.detail.value });
    },

    async loadJobs() {
        try {
            const res = await insightsApi.getUserJobs(this.data.userId);
            this.setData({ jobs: res || [] });
        } catch (e) {
            console.error(e);
        }
    },

    async startScan() {
        if (!this.data.targetUrl) {
            wx.showToast({ title: '请输入网址', icon: 'none' });
            return;
        }
        this.setData({ loading: true });
        try {
            const res = await insightsApi.startScan(this.data.userId, this.data.targetUrl);
            wx.showToast({ title: '扫描已开始', icon: 'success' });
            this.setData({ targetUrl: '' });
            this.loadJobs();
        } catch (e) {
            wx.showToast({ title: '请求失败', icon: 'none' });
        } finally {
            this.setData({ loading: false });
        }
    },

    async viewDashboard(e) {
        const jobId = e.currentTarget.dataset.id;
        wx.showLoading({ title: '加载报告...' });
        try {
            const res = await insightsApi.getDashboard(jobId);
            this.setData({
                dashboard: res,
                showDashboard: true
            });
        } catch (e) {
            wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    closeDashboard() {
        this.setData({ showDashboard: false, dashboard: null });
    }
});
