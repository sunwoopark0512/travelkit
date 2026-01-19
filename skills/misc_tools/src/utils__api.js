// API请求工具，封装wx.request（类似axios拦截器模式）

const BASE_URL = 'http://localhost:8080'; // 后端API地址，需要根据实际情况修改
// const BASE_URL = 'https://cxbd.jiugan.net.cn'; // 后端API地址，需要根据实际情况修改

// 请求拦截器（在发送请求前处理）
function requestInterceptor(config) {
  // 获取token
  const token = wx.getStorageSync('token');
  
  // 设置请求头
  const header = {
    'Content-Type': 'application/json',
    ...config.header
  };
  
  // 添加认证token
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }
  
  // 如果是FormData（文件上传），让系统自动设置Content-Type
  // 注意：微信小程序使用wx.uploadFile处理文件上传，这里主要处理普通请求
  
  config.header = header;
  return config;
}

// 响应拦截器（处理响应数据）
function responseInterceptor(response) {
  // 直接返回response.data，与axios保持一致
  return response.data;
}

// 响应错误拦截器（处理错误响应）
function responseErrorInterceptor(error) {
  // 静默记录错误，避免抛出未捕获的异常
  try {
    console.error('API请求错误:', error);
    
    // 根据错误类型显示不同的提示
    if (error && error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        wx.showToast({
          title: '请求超时',
          icon: 'none'
        });
      } else if (error.errMsg.includes('fail') || error.errMsg.includes('Failed to fetch')) {
        // 静默处理网络失败，避免频繁提示
        console.warn('网络请求失败:', error.errMsg);
      }
    }
  } catch (e) {
    // 确保错误拦截器本身不会抛出异常
    console.error('错误拦截器异常:', e);
  }
  
  // 返回一个包含错误信息的对象，而不是 reject
  // 这样调用方可以统一处理，避免未捕获的异常
  return {
    success: false,
    message: error && error.errMsg ? error.errMsg : '网络请求失败',
    error: error
  };
}

/**
 * 发起请求（类似axios的请求方式）
 * @param {Object} options - 请求配置
 * @param {String} options.url - 请求URL
 * @param {String} options.method - 请求方法 (GET, POST, PUT, DELETE等)
 * @param {Object} options.data - 请求数据
 * @param {Object} options.header - 自定义请求头
 * @param {Object} options.params - URL参数（GET请求使用）
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 应用请求拦截器
    const config = requestInterceptor({
      url: options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header || {},
      params: options.params || {}
    });
    
    // 处理URL参数（所有请求方法都支持）
    let url = BASE_URL + config.url;
    if (config.params && Object.keys(config.params).length > 0) {
      const query = Object.keys(config.params)
        .map(key => `${key}=${encodeURIComponent(config.params[key])}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + query;
    }
    
    wx.request({
      url: url,
      method: config.method,
      data: config.method === 'GET' ? {} : config.data,
      header: config.header,
      timeout: 10000, // 10秒超时
      success: (res) => {
        // 应用响应拦截器
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = responseInterceptor(res);
              resolve(data);
            } catch (error) {
              // 错误拦截器会显示提示，然后 reject
              reject(responseErrorInterceptor(error));
            }
          } else {
            // HTTP状态码错误
            const error = new Error(`请求失败: ${res.statusCode}`);
            error.statusCode = res.statusCode;
            error.data = res.data;
            reject(responseErrorInterceptor(error));
          }
        } catch (e) {
          // 确保所有错误都被捕获
          console.error('处理响应时发生异常:', e);
          reject(responseErrorInterceptor(e));
        }
      },
      fail: (err) => {
        // 错误拦截器会显示提示，然后 reject
        reject(responseErrorInterceptor(err));
      }
    });
  });
}

// 用户相关API
const userApi = {
  // 用户登录
  login: (data) => request({ url: '/api/users/login', method: 'POST', data }),
  
  // 微信授权登录
  wechatLogin: (data) => request({ url: '/api/users/wechat-login', method: 'POST', data }),
  
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
    params: { pageNum, pageSize } 
  }),
  
  // 查询所有用户
  getAll: () => request({ url: '/api/users/all', method: 'GET' }),
  
  // 获取用户统计信息
  getStatistics: (id) => request({ url: `/api/users/${id}/statistics`, method: 'GET' }),
  
  // 禁用用户
  disableUser: (userId, currentUserId) => request({ 
    url: `/api/users/${userId}/disable`, 
    method: 'PUT', 
    params: currentUserId ? { currentUserId } : {},
    data: {} 
  }),
  
  // 启用用户
  enableUser: (userId) => request({ 
    url: `/api/users/${userId}/enable`, 
    method: 'PUT' 
  }),
  
  // 赋权用户（更新identity）
  grantUser: (userId, identity) => request({ 
    url: `/api/users/${userId}`, 
    method: 'PUT', 
    data: { identity } 
  }),
  
  // 获取游客用户
  getGuestUser: () => request({ url: '/api/users/guest', method: 'GET' })
};

// 图片爬虫相关API
const pictureCrawlerApi = {
  // 根据关键字搜索图片
  search: (keyword, limit = 1) => request({ 
    url: `/api/picture-crawler/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, 
    method: 'GET' 
  })
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

  // 更新行程名称
  updateName: (id, data) => request({ url: `/api/trips/${id}/name`, method: 'PATCH', data }),

  // 更新行程封面
  updateImg: (id, data) => request({ url: `/api/trips/${id}/img`, method: 'PATCH', data }),
  
  // 删除行程
  delete: (id) => request({ url: `/api/trips/${id}`, method: 'DELETE' }),
  
  // 分页查询行程
  getPage: (params) => request({ 
    url: '/api/trips/page', 
    method: 'GET',
    params: params
  }),
  
  // 更新行程进度
  updateProgress: (id, checkedItems, totalItems, progress) => request({ 
    url: `/api/trips/${id}/progress`, 
    method: 'PUT', 
    params: { checkedItems, totalItems, progress },
    data: {} 
  }),
  
  // 根据状态查询行程
  getByStatus: (status) => request({ url: `/api/trips/status/${status}`, method: 'GET' }),
  
  // 根据目的地查询行程
  getByDestination: (destination) => request({ url: `/api/trips/destination/${destination}`, method: 'GET' }),
  
  // 获取用户最近行程
  getRecentTrips: (userId, limit = 5) => request({ 
    url: `/api/trips/user/${userId}/recent`, 
    method: 'GET', 
    params: { limit } 
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
    url: `/api/items/${id}/check`, 
    method: 'PUT',
    params: { checked }
  }),
  
  // 重置所有勾选状态（批量删除行程中所有已勾选的物品）
  resetAllCheckedItems: (tripId) => request({ 
    url: `/api/items/trip/${tripId}/checked/reset-all`, 
    method: 'DELETE'
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
    params: params 
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
  getAll: () => {
    return request({ url: '/api/item-overview', method: 'GET' });
  },
  
  // 获取所有物品总览（包括禁用的）
  getAllIncludingInactive: () => request({ 
    url: '/api/item-overview/Admin', 
    method: 'GET',
    params: { includeInactive: true }
  }),
  
  // 根据条件筛选物品总览
  getFilteredItems: (params) => request({ 
    url: '/api/item-overview/filter', 
    method: 'GET',
    params: params
  }),
  
  // 添加物品总览
  add: (data) => request({ url: '/api/item-overview', method: 'POST', data }),
  
  // 更新物品总览
  update: (id, data) => request({ url: `/api/item-overview/${id}`, method: 'PUT', data })
};

// Check Test接口：适配TestController的测试接口（/api/test/getCityList 与 /api/test/weather30d）
const checkTestApi = {
  getCityList: (dest) => request({ 
    url: '/api/test/getCityList', 
    method: 'GET',
    params: { dest }
  }),
  getWeather30d: (locationId) => request({ 
    url: '/api/test/weather30d', 
    method: 'GET',
    params: { locationId }
  })
};

// 行程模板相关API
const tripTemplateApi = {
  // 根据ID查询模板
  getById: (id, userId) => request({ 
    url: `/api/templates/${id}`, 
    method: 'GET',
    params: userId ? { userId } : {}
  }),
  
  // 查询所有公开模板（已审核）
  getPublicTemplates: () => request({ url: '/api/templates/public', method: 'GET' }),
  
  // 查询可用模板：已审核已公开的模板，或者当前用户创建的私有模板
  getAvailableTemplates: (userId) => request({ 
    url: '/api/templates/available', 
    method: 'GET',
    params: { userId }
  }),
  
  // 根据创建者查询模板
  getByCreatedBy: (createdBy, userId) => {
    const operatorId = userId || createdBy;
    return request({ 
      url: `/api/templates/user/${createdBy}`, 
      method: 'GET',
      params: { userId: operatorId }
    });
  },
  
  // 根据类型查询模板
  getByType: (type) => request({ url: `/api/templates/type/${type}`, method: 'GET' }),
  
  // 根据目的地查询模板
  getByDestination: (destination) => request({ url: `/api/templates/destination/${destination}`, method: 'GET' }),
  
  // 分页查询模板
  getPage: (params) => request({ url: '/api/templates/page', method: 'GET', params: params }),
  
  // 创建模板
  create: (data) => request({ 
    url: '/api/templates', 
    method: 'POST', 
    params: { userId: data.createdBy },
    data: data 
  }),
  
  // 更新模板
  update: (id, userId, data) => request({ 
    url: `/api/templates/${id}`, 
    method: 'PUT', 
    params: { userId },
    data: data 
  }),
  
  // 删除模板
  delete: (id, userId) => request({ 
    url: `/api/templates/${id}`, 
    method: 'DELETE',
    params: { userId }
  }),
  
  // 再次申请公开（重置审核状态）
  reapplyPublic: (id) => request({ 
    url: `/api/templates/${id}/reapply-public`, 
    method: 'PUT' 
  }),
  
  // 查询待审核的模板（管理员用）
  getPendingTemplates: () => request({ url: '/api/templates/pending', method: 'GET' }),
  
  // 查询所有模板（管理员用，包括公开和私有）
  getAllTemplates: () => request({ url: '/api/templates/all', method: 'GET' }),
  
  // 审核通过模板
  approveTemplate: (templateId, data) => request({ 
    url: `/api/templates/${templateId}/approve`, 
    method: 'PUT', 
    data 
  }),
  
  // 审核拒绝模板
  rejectTemplate: (templateId, data) => request({ 
    url: `/api/templates/${templateId}/reject`, 
    method: 'PUT', 
    data 
  })
};

// 模板物品相关API
const templateItemApi = {
  // 根据ID查询模板物品
  getById: (id) => request({ url: `/api/template-items/${id}`, method: 'GET' }),
  
  // 根据模板ID查询物品列表
  getByTemplateId: (templateId) => request({ url: `/api/template-items/template/${templateId}`, method: 'GET' }),
  
  // 添加模板物品
  add: (userId, data) => request({ 
    url: '/api/template-items', 
    method: 'POST', 
    params: { userId },
    data: data 
  }),
  
  // 更新模板物品
  update: (id, userId, data) => request({ 
    url: `/api/template-items/${id}`, 
    method: 'PUT', 
    params: { userId },
    data: data 
  }),
  
  // 删除模板物品
  delete: (id, userId) => request({ 
    url: `/api/template-items/${id}`, 
    method: 'DELETE',
    params: { userId }
  })
};

// 物品分类相关API
const itemCategoryApi = {
  // 获取所有分类
  getAll: () => request({ url: '/api/categories/all', method: 'GET' }),
  
  // 根据ID查询分类
  getById: (id) => request({ url: `/api/categories/${id}`, method: 'GET' }),
  
  // 根据代码查询分类
  getByCode: (code) => request({ url: `/api/categories/code/${code}`, method: 'GET' })
};

// 图片相关API
const pictureApi = {
  // 根据地点名称获取图片
  getPicture: (locationName) => request({ 
    url: `/api/picture/getPicture/${encodeURIComponent(locationName)}`, 
    method: 'POST' 
  })
};

// 天气相关API（通过后端代理）
const weatherApi = {
  // 搜索城市
  searchCities: (location) => request({ 
    url: '/api/weather/cities/search', 
    method: 'GET', 
    params: { location } 
  }),
  
  // 获取实时天气
  getCurrentWeather: (location) => request({ 
    url: '/api/weather/now', 
    method: 'GET', 
    params: { location } 
  }),
  
  // 获取3天预报
  getWeather3Days: (location) => request({ 
    url: '/api/weather/forecast/3d', 
    method: 'GET', 
    params: { location } 
  }),
  
  // 获取7天预报
  getWeather7Days: (location) => request({ 
    url: '/api/weather/forecast/7d', 
    method: 'GET', 
    params: { location } 
  }),
  
  // 获取30天预报
  getWeather30Days: (location) => request({ 
    url: '/api/weather/forecast/30d', 
    method: 'GET', 
    params: { location } 
  })
};

// 文件上传相关API
const uploadApi = {
  // 上传图片文件
  uploadImage: (filePath) => {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      const header = {
        'Authorization': token ? `Bearer ${token}` : ''
      };
      
      wx.uploadFile({
        url: BASE_URL + '/api/upload/image',
        filePath: filePath,
        name: 'file',
        header: header,
        timeout: 30000, // 文件上传可能需要更长时间
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            console.error('解析上传响应失败:', e);
            reject(new Error('解析响应失败'));
          }
        },
        fail: (err) => {
          console.error('上传文件失败:', err);
          reject(err);
        }
      });
    });
  }
};

// 统一导出所有API
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
  pictureCrawlerApi: pictureCrawlerApi,
  itemCategoryApi: itemCategoryApi,
  pictureApi: pictureApi,
  uploadApi: uploadApi,
  weatherApi: weatherApi,
  BASE_URL: BASE_URL,
  default: request
};
