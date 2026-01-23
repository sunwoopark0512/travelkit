const BASE_URL = 'http://localhost:8080/api/builder';

export const builderApi = {
    // 创建想法
    createIdea: (userId, data) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/ideas?userId=${userId}`,
                method: 'POST',
                data: data,
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    },

    // 获取预览
    getPreview: (id) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/previews/${id}`,
                method: 'GET',
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    },

    // 部署
    deploy: (id, platform) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/deploy/${id}`,
                method: 'POST',
                data: { platform },
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    }
};
