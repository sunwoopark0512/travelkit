import { builderApi } from '../../utils/builderApi';

Page({
    data: {
        step: 1, // 1: Input, 2: Preview, 3: Success
        idea: '',
        themes: ['现代极简', '赛博朋克', '自然清新', '商务专业'],
        themeIndex: 0,
        tones: ['友好', '专业', '幽默', '紧迫'],
        toneIndex: 0,
        loading: false,
        deploying: false,
        previewData: null
    },

    onIdeaInput(e) {
        this.setData({ idea: e.detail.value });
    },

    onThemeChange(e) {
        this.setData({ themeIndex: e.detail.value });
    },

    onToneChange(e) {
        this.setData({ toneIndex: e.detail.value });
    },

    async generateSite() {
        if (!this.data.idea.trim()) {
            wx.showToast({ title: '请输入想法', icon: 'none' });
            return;
        }

        this.setData({ loading: true });
        try {
            const res = await builderApi.createIdea(1001, {
                idea: this.data.idea,
                theme: this.data.themes[this.data.themeIndex],
                tone: this.data.tones[this.data.toneIndex],
                title: this.data.idea.substring(0, 10)
            });

            if (res.success) {
                this.setData({
                    step: 2,
                    previewData: res.data
                });
            } else {
                wx.showToast({ title: res.message || '生成失败', icon: 'none' });
            }
        } catch (err) {
            wx.showToast({ title: '网络错误', icon: 'none' });
            console.error(err);
        } finally {
            this.setData({ loading: false });
        }
    },

    async deploySite() {
        this.setData({ deploying: true });
        try {
            const res = await builderApi.deploy(this.data.previewData.id, 'vercel');
            if (res.success) {
                this.setData({
                    step: 3,
                    previewData: res.data
                });
            } else {
                wx.showToast({ title: res.message || '部署失败', icon: 'none' });
            }
        } catch (err) {
            wx.showToast({ title: '部署请求失败', icon: 'none' });
        } finally {
            this.setData({ deploying: false });
        }
    },

    copyLink() {
        wx.setClipboardData({
            data: this.data.previewData.deploymentUrl,
            success: () => wx.showToast({ title: '已复制' })
        });
    },

    reset() {
        this.setData({
            step: 1,
            idea: '',
            previewData: null
        });
    }
});
