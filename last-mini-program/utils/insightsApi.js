const BASE_URL = 'http://localhost:8080/api/insights';

export const insightsApi = {
    // Start Scan
    startScan: (userId, targetUrl) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/scan?userId=${userId}`,
                method: 'POST',
                data: { targetUrl },
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    },

    // Get Dashboard
    getDashboard: (jobId) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/dashboard/${jobId}`,
                method: 'GET',
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    },

    // Get User Jobs
    getUserJobs: (userId) => {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${BASE_URL}/jobs?userId=${userId}`,
                method: 'GET',
                success: (res) => resolve(res.data),
                fail: (err) => reject(err)
            });
        });
    }
};
