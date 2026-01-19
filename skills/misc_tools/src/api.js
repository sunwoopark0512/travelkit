// API请求工具，封装wx.request

const BASE_URL = 'http://localhost:8080'; // 后端API地址，需要根据实际情况修改

/**
 * 发起请求
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 获取token
    const token = wx.getStorageSync('token');
    
    // 设置请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };
    
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('API请求错误:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

// 用户相关API
const userApi = {
  // 用户登录
  login: (data) => request({ url: '/api/users/login', method: 'POST', data }),
  
  // 用户注册
  register: (data) => request({ url: '/api/users/register', method: 'POST', data }),
  
  // 根据ID查询用户
  getById: (id) => request({ url: `/api/users/${id}`, method: 'GET' }),
  
  // 更新用户信息
  update: (id, data) => request({ url: `/api/users/${id}`, method: 'PUT', data }),
  
  // 删除用户
  delete: (id) => request({ url: `/api/users/${id}`, method: 'DELETE' }),
  
  // 分页查询用户
  getPage: (pageNum = 1, pageSize = 10) => request({ 
    url: '/api/users/page', 
    method: 'GET', 
    data: { pageNum, pageSize } 
  }),
  
  // 查询所有用户
  getAll: () => request({ url: '/api/users/all', method: 'GET' })
};

// 行程相关API
const tripApi = {
  // 根据ID查询行程
  getById: (id) => request({ url: `/api/trips/${id}`, method: 'GET' }),
  
  // 根据用户ID查询行程列表
  getByUserId: (userId) => request({ url: `/api/trips/user/${userId}`, method: 'GET' }),
  
  // 创建行程
  create: (data) => request({ url: '/api/trips', method: 'POST', data }),
  
  // 更新行程
  update: (id, data) => request({ url: `/api/trips/${id}`, method: 'PUT', data }),
  
  // 删除行程
  delete: (id) => request({ url: `/api/trips/${id}`, method: 'DELETE' }),
  
  // 分页查询行程
  getPage: (params) => {
    // 将params转换为URL参数
    const query = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
    return request({ 
      url: `/api/trips/page?${query}`, 
      method: 'GET'
    });
  },
  
  // 更新行程进度
  updateProgress: (id, checkedItems, totalItems, progress) => request({ 
    url: `/api/trips/${id}/progress`, 
    method: 'PUT', 
    data: { checkedItems, totalItems, progress } 
  }),
  
  // 根据状态查询行程
  getByStatus: (status) => request({ url: `/api/trips/status/${status}`, method: 'GET' }),
  
  // 根据目的地查询行程
  getByDestination: (destination) => request({ url: `/api/trips/destination/${destination}`, method: 'GET' }),
  
  // 获取用户最近行程
  getRecentTrips: (userId, limit = 5) => request({ 
    url: `/api/trips/user/${userId}/recent`, 
    method: 'GET', 
    data: { limit } 
  })
};

// Check相关API
const checkApi = {
  // 根据行程ID获取查验详情
  getTripCheckDetail: (tripId) => request({ url: `/api/trips/${tripId}`, method: 'GET' }),
  
  // 开始查验
  startCheck: (tripId) => request({ url: `/api/trips/${tripId}/check`, method: 'POST' }),
  
  // 暂停查验
  pauseCheck: (tripId) => request({ url: `/api/trips/${tripId}/pause`, method: 'POST' }),
  
  // 完成查验
  completeCheck: (tripId) => request({ url: `/api/trips/${tripId}/complete`, method: 'POST' }),
  
  // 更新查验进度
  updateCheckProgress: (tripId, data) => request({ 
    url: `/api/trips/${tripId}/check`, 
    method: 'PUT', 
    data: data 
  }),
  
  // 获取查验历史
  getCheckHistory: (tripId) => request({ url: `/api/trips/${tripId}/check/history`, method: 'GET' })
};

// 物品相关API
const itemApi = {
  // 根据ID查询物品
  getById: (id) => request({ url: `/api/items/${id}`, method: 'GET' }),
  
  // 根据行程ID查询物品列表
  getByTripId: (tripId) => request({ url: `/api/items/trip/${tripId}`, method: 'GET' }),
  
  // 添加物品
  add: (data) => request({ url: '/api/items', method: 'POST', data }),
  
  // 批量添加物品
  batchAdd: (data) => request({ url: '/api/items/batch', method: 'POST', data }),
  
  // 更新物品
  update: (id, data) => request({ url: `/api/items/${id}`, method: 'PUT', data }),
  
  // 删除物品
  delete: (id) => request({ url: `/api/items/${id}`, method: 'DELETE' }),
  
  // 更新物品查验状态
  updateCheckedStatus: (id, checked) => request({ 
    url: `/api/items/${id}/check?checked=${checked}`, 
    method: 'PUT'
  }),
  
  // 根据分类查询物品
  getByCategory: (tripId, categoryId) => request({ 
    url: `/api/items/trip/${tripId}/category/${categoryId}`, 
    method: 'GET' 
  }),
  
  // 根据分类代码查询物品
  getByCategoryCode: (tripId, categoryCode) => request({ 
    url: `/api/items/trip/${tripId}/category-code/${categoryCode}`, 
    method: 'GET' 
  }),
  
  // 根据查验状态查询物品
  getByCheckedStatus: (tripId, checked) => request({ 
    url: `/api/items/trip/${tripId}/checked/${checked}`, 
    method: 'GET' 
  }),
  
  // 统计行程物品总数
  countByTripId: (tripId) => request({ url: `/api/items/trip/${tripId}/count`, method: 'GET' }),
  
  // 统计已查验物品数
  countCheckedByTripId: (tripId) => request({ url: `/api/items/trip/${tripId}/checked-count`, method: 'GET' }),
  
  // 从模板创建物品
  createFromTemplate: (tripId, templateId) => request({ 
    url: `/api/items/trip/${tripId}/template/${templateId}`, 
    method: 'POST' 
  }),
  
  // 根据模板物品ID删除旅程物品
  deleteByTemplateItemId: (tripId, templateItemId) => request({ 
    url: `/api/items/trip/${tripId}/template-item/${templateItemId}`, 
    method: 'DELETE' 
  }),
  
  // 获取物品总览列表
  getItemOverview: () => request({ url: '/api/item-overview', method: 'GET' }),
  
  // 根据物品总览ID删除旅程物品
  deleteByItemOverviewId: (tripId, itemOverviewId) => request({ 
    url: `/api/items/trip/${tripId}/item-overview/${itemOverviewId}`, 
    method: 'DELETE' 
  }),
  
  // 根据物品总览ID查询旅程物品
  getByItemOverviewId: (tripId, itemOverviewId) => request({ 
    url: `/api/items/trip/${tripId}/item-overview/${itemOverviewId}`, 
    method: 'GET' 
  }),
  
  // 添加物品到总览
  addToItemOverview: (data) => request({ url: '/api/item-overview', method: 'POST', data }),
  
  // 根据条件筛选物品
  getFilteredItems: (tripId, params) => request({ 
    url: `/api/items/trip/${tripId}/filter`, 
    method: 'GET', 
    data: params 
  }),
  
  // 删除查验记录（取消勾选并删除查验历史）
  removeCheckRecord: (tripId, itemId) => request({ 
    url: `/api/items/trip/${tripId}/item/${itemId}/check-record`, 
    method: 'DELETE' 
  })
};

// 查验历史相关API
const checkHistoryApi = {
  // 根据ID查询查验历史
  getById: (id) => request({ url: `/api/check-history/${id}`, method: 'GET' }),
  
  // 根据行程ID查询查验历史
  getByTripId: (tripId) => request({ url: `/api/check-history/trip/${tripId}`, method: 'GET' }),
  
  // 根据用户ID查询查验历史
  getByUserId: (userId) => request({ url: `/api/check-history/user/${userId}`, method: 'GET' }),
  
  // 根据物品ID查询查验历史
  getByItemId: (itemId) => request({ url: `/api/check-history/item/${itemId}`, method: 'GET' }),
  
  // 添加查验历史
  add: (data) => request({ url: '/api/check-history', method: 'POST', data }),
  
  // 更新查验历史
  update: (id, data) => request({ url: `/api/check-history/${id}`, method: 'PUT', data }),
  
  // 删除查验历史
  delete: (id) => request({ url: `/api/check-history/${id}`, method: 'DELETE' }),
  
  // 根据物品ID删除查验历史
  deleteByItemId: (itemId) => request({ url: `/api/check-history/item/${itemId}`, method: 'DELETE' }),
  
  // 统计行程查验次数
  countByTripId: (tripId) => request({ url: `/api/check-history/trip/${tripId}/count`, method: 'GET' })
};

// 物品总览相关API
const itemOverviewApi = {
  // 获取所有物品总览
  getAll: () => request({ url: '/api/item-overview', method: 'GET' }),
  
  // 根据条件筛选物品总览
  getFilteredItems: (params) => request({ 
    url: '/api/item-overview/filter', 
    method: 'GET', 
    data: params 
  })
};

// Check Test接口：适配TestController的测试接口
const checkTestApi = {
  getCityList: (dest) => {
    const query = `dest=${dest}`;
    return request({ url: `/api/test/getCityList?${query}`, method: 'GET' });
  },
  getWeather30d: (locationId) => {
    const query = `locationId=${locationId}`;
    return request({ url: `/api/test/weather30d?${query}`, method: 'GET' });
  }
};

// 行程模板相关API
const tripTemplateApi = {
  // 根据ID查询模板
  getById: (id) => request({ url: `/api/templates/${id}`, method: 'GET' }),
  
  // 查询所有公开模板
  getPublicTemplates: () => request({ url: '/api/templates/public', method: 'GET' }),
  
  // 根据创建者查询模板
  getByCreatedBy: (createdBy) => request({ url: `/api/templates/user/${createdBy}`, method: 'GET' }),
  
  // 根据类型查询模板
  getByType: (type) => request({ url: `/api/templates/type/${type}`, method: 'GET' }),
  
  // 根据目的地查询模板
  getByDestination: (destination) => request({ url: `/api/templates/destination/${destination}`, method: 'GET' }),
  
  // 分页查询模板
  getPage: (params) => request({ url: '/api/templates/page', method: 'GET', data: params })
};

// 模板物品相关API
const templateItemApi = {
  // 获取所有模板物品
  getAll: () => request({ url: '/api/template-items', method: 'GET' }),
  
  // 根据ID查询模板物品
  getById: (id) => request({ url: `/api/template-items/${id}`, method: 'GET' }),
  
  // 根据模板ID查询物品列表
  getByTemplateId: (templateId) => request({ url: `/api/template-items/template/${templateId}`, method: 'GET' }),
  
  // 添加模板物品
  add: (data) => request({ url: '/api/template-items', method: 'POST', data }),
  
  // 更新模板物品
  update: (id, data) => request({ url: `/api/template-items/${id}`, method: 'PUT', data }),
  
  // 删除模板物品
  delete: (id) => request({ url: `/api/template-items/${id}`, method: 'DELETE' })
};

module.exports = {
  userApi: userApi,
  tripApi: tripApi,
  itemApi: itemApi,
  checkHistoryApi: checkHistoryApi,
  itemOverviewApi: itemOverviewApi,
  checkTestApi: checkTestApi,
  checkApi: checkApi,
  tripTemplateApi: tripTemplateApi,
  templateItemApi: templateItemApi,
  default: request
};

