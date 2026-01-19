// pages/admin/admin.js
const { userApi, tripTemplateApi, templateItemApi, itemOverviewApi, itemCategoryApi, pictureCrawlerApi } = require('../../utils/api.js');
const { getCurrentUserId, getCurrentUser, isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    activeTab: 0, // 0: 模板管理, 1: 用户管理, 2: 物品总览
    loading: false,
    
    // 模板管理
    templates: [],
    filteredTemplates: [],
    templateStatusFilter: null, // null: 全部, 0: 待审核, 1: 已通过, 2: 已拒绝, 'no-audit': 无需审核
    templateCreatorNameFilter: '',
    selectedTemplate: null,
    templateDetailVisible: false,
    templateItems: [],
    loadingTemplateItems: false,
    auditDialogVisible: false,
    auditForm: {
      templateId: null,
      result: ''
    },
    auditAction: '', // 'approve' 或 'reject'
    
    // 用户管理
    users: [],
    filteredUsers: [],
    userSearchKeyword: '',
    userStatusFilter: null, // null: 全部, 0: 正常, 1: 封禁
    selectedUser: null,
    userDetailVisible: false,
    grantUserVisible: false,
    grantUserForm: {
      id: null,
      username: '',
      name: '',
      identity: 0
    },
    
    // 物品总览管理
    itemOverviews: [],
    filteredItemOverviews: [],
    itemOverviewSearchKeyword: '',
    selectedCategoryId: null,
    categoryFilterIndex: 0, // 分类筛选器当前选中的索引
    categoryRange: ['全部'], // 分类筛选器的选项数组
    categoryNames: [], // 分类名称数组（用于创建物品的选择器，不包含"全部"）
    itemOverviewStatusFilter: null, // null: 全部, 1: 激活, 0: 禁用
    categories: [],
    categoryMap: {},
    itemOverviewDialogVisible: false,
    selectedItemOverview: null, // 选中的物品总览详情
    itemOverviewDetailVisible: false, // 物品详情对话框可见性
    itemOverviewCreateVisible: false, // 创建物品对话框可见性
    itemOverviewForm: {
      id: null,
      name: '',
      categoryId: null,
      categoryName: '',
      description: '',
      imageUrl: '',
      tags: [],
      isActive: 1
    },
    tagsInput: '', // 标签输入字符串，格式：证件,国际
    crawledImages: [], // 爬虫获取的图片列表
    currentImageIndex: 0, // 当前选中的爬虫图片索引
    generatingImage: false, // 是否正在生成图片
    selectedCategoryIndex: -1 // 选中的分类索引
  },

  onLoad() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 检查是否是管理员
    const user = getCurrentUser();
    if (!user || user.identity !== 1) {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
    
    this.loadData();
  },

  onShow() {
    if (isLoggedIn()) {
      const user = getCurrentUser();
      if (!user || user.identity !== 1) {
        wx.navigateBack();
        return;
      }
    }
  },

  // 加载数据
  async loadData() {
    if (this.data.activeTab === 0) {
      await this.loadTemplates();
    } else if (this.data.activeTab === 1) {
      await this.loadUsers();
    } else if (this.data.activeTab === 2) {
      await this.loadCategories();
      await this.loadItemOverviews();
    }
  },

  // 切换标签页
  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ activeTab: index });
    this.loadData();
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 关闭审核对话框
  closeAuditDialog() {
    this.setData({ 
      auditDialogVisible: false,
      auditForm: {
        templateId: null,
        result: ''
      }
    });
  },

  // 关闭用户详情
  closeUserDetail() {
    this.setData({ userDetailVisible: false });
  },

  // 关闭赋权对话框
  closeGrantUser() {
    this.setData({ 
      grantUserVisible: false,
      grantUserForm: {
        id: null,
        username: '',
        name: '',
        identity: 0
      }
    });
  },

  // ========== 模板管理 ==========
  
  // 加载所有模板（只加载公开模板 is_public=1）
  async loadTemplates() {
    this.setData({ loading: true });
    try {
      // 并行加载模板和用户数据
      const [templateResponse, userResponse] = await Promise.all([
        tripTemplateApi.getAllTemplates(),
        userApi.getAll()
      ]);
      
      if (templateResponse.success && templateResponse.data) {
        let templates = Array.isArray(templateResponse.data) ? templateResponse.data : [];
        
        // 只保留公开模板（is_public=1 或 is_public=true）
        templates = templates.filter(template => {
          return template.isPublic === true || template.isPublic === 1;
        });
        
        // 如果有用户数据，映射创建者姓名
        if (userResponse && userResponse.success && userResponse.data) {
          const userMap = {};
          (Array.isArray(userResponse.data) ? userResponse.data : []).forEach(user => {
            userMap[user.id] = user.name || user.username || `ID: ${user.id}`;
          });
          
          templates = templates.map(template => ({
            ...template,
            createdByName: userMap[template.createdBy] || `ID: ${template.createdBy}`,
            // 预处理显示数据
            typeText: this.getTypeText(template.type),
            statusText: this.getStatusText(template.isStatus, template.isPublic),
            createdAtText: this.formatDate(template.createdAt),
            updatedAtText: this.formatDate(template.updatedAt)
          }));
        } else {
          // 即使没有用户数据，也要预处理显示数据
          templates = templates.map(template => ({
            ...template,
            typeText: this.getTypeText(template.type),
            statusText: this.getStatusText(template.isStatus, template.isPublic),
            createdAtText: this.formatDate(template.createdAt),
            updatedAtText: this.formatDate(template.updatedAt)
          }));
        }
        
        this.setData({ templates });
        this.filterTemplates();
      } else {
        wx.showToast({
          title: templateResponse.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 筛选模板（只筛选公开模板，因为列表已经只包含公开模板）
  filterTemplates() {
    let filtered = this.data.templates;
    
    // 按审核状态筛选（只筛选公开模板的审核状态）
    if (this.data.templateStatusFilter !== null) {
      if (this.data.templateStatusFilter === 'no-audit') {
        // 公开模板不应该有"无需审核"状态，所以返回空数组
        filtered = [];
      } else {
        const statusValue = this.data.templateStatusFilter;
        filtered = filtered.filter(t => {
          // 确保是公开模板
          if (!(t.isPublic === true || t.isPublic === 1)) return false;
          return t.isStatus === statusValue;
        });
      }
    }
    
    // 按创建者姓名筛选
    if (this.data.templateCreatorNameFilter) {
      const keyword = this.data.templateCreatorNameFilter.trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter(t => {
          const creatorName = (t.createdByName || '').toLowerCase();
          return creatorName.includes(keyword);
        });
      }
    }
    
    this.setData({ filteredTemplates: filtered });
  },

  // 模板状态筛选变化
  onTemplateStatusFilterChange(e) {
    const value = parseInt(e.detail.value);
    // value: 0=全部, 1=待审核, 2=已通过, 3=已拒绝
    // 转换为: null=全部, 0=待审核, 1=已通过, 2=已拒绝
    const statusValue = value === 0 ? null : value - 1;
    this.setData({ 
      templateStatusFilter: statusValue
    });
    this.filterTemplates();
  },

  // 创建者姓名筛选输入
  onTemplateCreatorNameInput(e) {
    this.setData({ 
      templateCreatorNameFilter: e.detail.value 
    });
    this.filterTemplates();
  },

  // 查看模板详情
  async viewTemplateDetail(e) {
    console.log('viewTemplateDetail被调用', e);
    const templateId = e.currentTarget.dataset.id;
    console.log('模板ID:', templateId);
    
    if (!templateId) {
      wx.showToast({
        title: '模板ID为空',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    try {
      // 从后端获取完整的模板信息
      const templateResponse = await tripTemplateApi.getById(templateId);
      
      if (!templateResponse.success || !templateResponse.data) {
        wx.hideLoading();
        wx.showToast({
          title: templateResponse.message || '加载模板信息失败',
          icon: 'none'
        });
        return;
      }
      
      const template = templateResponse.data;
      
      // 预处理模板数据，添加显示文本
      const processedTemplate = {
        ...template,
        typeText: this.getTypeText(template.type),
        statusText: this.getStatusText(template.isStatus, template.isPublic),
        createdAtText: this.formatDate(template.createdAt),
        updatedAtText: this.formatDate(template.updatedAt),
        isPublicText: template.isPublic ? '公开' : '私有',
        createdByName: template.createdByName || `ID: ${template.createdBy}`
      };
      
      // 设置对话框可见和模板数据
      this.setData({
        templateDetailVisible: true,
        selectedTemplate: processedTemplate,
        templateItems: [],
        loadingTemplateItems: true
      }, () => {
        console.log('对话框状态已更新:', {
          templateDetailVisible: this.data.templateDetailVisible,
          selectedTemplate: this.data.selectedTemplate ? '已设置' : '未设置'
        });
      });
      
      // 加载模板物品列表
      await this.loadTemplateItems(templateId);
      
      wx.hideLoading();
    } catch (error) {
      console.error('加载模板详情失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败，请检查网络连接',
        icon: 'none'
      });
    }
  },

  // 加载模板物品列表
  async loadTemplateItems(templateId) {
    this.setData({ loadingTemplateItems: true });
    try {
      const response = await templateItemApi.getByTemplateId(templateId);
      if (response.success) {
        const items = (response.data || []).map(item => ({
          ...item,
          priorityText: this.getPriorityText(item.priority)
        }));
        this.setData({ templateItems: items });
      } else {
        this.setData({ templateItems: [] });
      }
    } catch (error) {
      console.error('加载模板物品失败:', error);
      this.setData({ templateItems: [] });
    } finally {
      this.setData({ loadingTemplateItems: false });
    }
  },

  // 关闭模板详情
  closeTemplateDetail() {
    this.setData({ 
      templateDetailVisible: false,
      selectedTemplate: null,
      templateItems: []
    });
  },

  // 审核模板
  openAuditDialog(e) {
    const templateId = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action; // 'approve' 或 'reject'
    this.setData({
      auditDialogVisible: true,
      auditAction: action,
      auditForm: {
        templateId: templateId,
        result: ''
      }
    });
  },

  // 审核原因输入
  onAuditResultInput(e) {
    this.setData({
      'auditForm.result': e.detail.value
    });
  },

  // 提交审核
  async submitAudit() {
    const { templateId, result } = this.data.auditForm;
    if (!result || !result.trim()) {
      wx.showToast({
        title: '请输入审核原因',
        icon: 'none'
      });
      return;
    }
    
    if (result.trim().length < 5) {
      wx.showToast({
        title: '审核原因至少需要5个字符',
        icon: 'none'
      });
      return;
    }
    
    try {
      const requestData = { result: result.trim() };
      const response = this.data.auditAction === 'approve' 
        ? await tripTemplateApi.approveTemplate(templateId, requestData)
        : await tripTemplateApi.rejectTemplate(templateId, requestData);
      
      if (response && response.success) {
        wx.showToast({
          title: this.data.auditAction === 'approve' ? '审核通过成功' : '拒绝成功',
          icon: 'success'
        });
        this.setData({ 
          auditDialogVisible: false,
          auditForm: {
            templateId: null,
            result: ''
          }
        });
        await this.loadTemplates();
      } else {
        wx.showToast({
          title: response?.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('提交审核失败:', error);
      wx.showToast({
        title: '操作失败，请检查网络连接',
        icon: 'none'
      });
    }
  },

  // ========== 用户管理 ==========
  
  // 加载用户列表
  async loadUsers() {
    this.setData({ loading: true });
    try {
      const response = await userApi.getAll();
      if (response.success && response.data) {
        const users = Array.isArray(response.data) ? response.data : [];
        this.setData({ users });
        this.filterUsers();
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 筛选用户
  filterUsers() {
    let filtered = this.data.users;
    
    // 按状态筛选
    if (this.data.userStatusFilter !== null) {
      filtered = filtered.filter(user => {
        return user.isStatus === this.data.userStatusFilter;
      });
    }
    
    // 按姓名搜索
    if (this.data.userSearchKeyword) {
      const keyword = this.data.userSearchKeyword.toLowerCase();
      filtered = filtered.filter(user => {
        return (
          (user.username && user.username.toLowerCase().includes(keyword)) ||
          (user.name && user.name.toLowerCase().includes(keyword))
        );
      });
    }
    
    this.setData({ filteredUsers: filtered });
  },

  // 用户搜索输入
  onUserSearchInput(e) {
    this.setData({ userSearchKeyword: e.detail.value });
    this.filterUsers();
  },

  // 用户状态筛选变化
  onUserStatusFilterChange(e) {
    const value = parseInt(e.detail.value);
    // value: 0=全部, 1=正常, 2=封禁
    // 转换为: null=全部, 0=正常, 1=封禁
    const statusValue = value === 0 ? null : value - 1;
    this.setData({ 
      userStatusFilter: statusValue
    });
    this.filterUsers();
  },

  // 查看用户详情
  viewUserDetail(e) {
    const user = e.currentTarget.dataset.user;
    this.setData({
      selectedUser: user,
      userDetailVisible: true
    });
  },

  // 赋权用户
  grantUser(e) {
    const user = e.currentTarget.dataset.user;
    const CurrentUserId=getCurrentUserId();
    if(user.id==CurrentUserId)
    {
    wx.showToast({
        title: '不能对自己赋权',
        icon: 'error'
      });
      return;
    }
    this.setData({
      grantUserVisible: true,
      grantUserForm: {
        id: user.id,
        username: user.username || '',
        name: user.name || '',
        identity: user.identity || 0
      }
    });
  },

  // 赋权身份选择
  onIdentityChange(e) {
    this.setData({
      'grantUserForm.identity': parseInt(e.detail.value)
    });
  },

  // 提交赋权
  async submitGrantUser() {
    const { id, identity } = this.data.grantUserForm;
    try {
      const response = await userApi.update(id, { identity });
      if (response.success) {
        wx.showToast({
          title: '赋权成功',
          icon: 'success'
        });
        this.setData({ grantUserVisible: false });
        await this.loadUsers();
      } else {
        wx.showToast({
          title: response.message || '赋权失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('赋权失败:', error);
      wx.showToast({
        title: '赋权失败',
        icon: 'none'
      });
    }
  },

  // 禁用用户
  async disableUser(e) {
    const userId = e.currentTarget.dataset.id;
    const currentUserId = getCurrentUserId();
    
    if (userId === currentUserId) {
      wx.showToast({
        title: '不能禁用自己的账号',
        icon: 'error'
      });
      return;
    }
    
    wx.showModal({
      title: '确认禁用',
      content: '确定要禁用该用户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 注意：需要后端提供 disableUser API
            const response = await userApi.update(userId, { isStatus: 1 });
            if (response.success) {
              wx.showToast({
                title: '禁用成功',
                icon: 'success'
              });
              await this.loadUsers();
            }
          } catch (error) {
            console.error('禁用用户失败:', error);
            wx.showToast({
              title: '禁用失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 启用用户
  async enableUser(e) {
    const userId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认启用',
      content: '确定要启用该用户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await userApi.update(userId, { isStatus: 0 });
            if (response.success) {
              wx.showToast({
                title: '启用成功',
                icon: 'success'
              });
              await this.loadUsers();
            }
          } catch (error) {
            console.error('启用用户失败:', error);
            wx.showToast({
              title: '启用失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // ========== 物品总览管理 ==========
  
  // 加载物品总览
  async loadItemOverviews() {
    this.setData({ loading: true });
    try {
      // 尝试获取所有物品（包括禁用的）
      let response;
      try {
        response = await itemOverviewApi.getAllIncludingInactive();
      } catch (e) {
        // 如果后端不支持，使用普通getAll
        response = await itemOverviewApi.getAll();
      }
      
      if (response.success && response.data) {
        let items = Array.isArray(response.data) ? response.data : [];
        // 为每个物品添加分类名称，并处理tags字段
        items = items.map(item => {
          // 处理tags：如果是字符串，解析为数组；如果已经是数组，直接使用
          let tags = [];
          if (item.tags) {
            if (typeof item.tags === 'string') {
              try {
                // 尝试解析为JSON数组
                const parsed = JSON.parse(item.tags);
                if (Array.isArray(parsed)) {
                  tags = parsed;
                } else {
                  // 如果不是JSON数组，尝试按逗号分割（支持英文和中文逗号）
                  tags = item.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
                }
              } catch (e) {
                // 如果解析失败，尝试按逗号分割（支持英文和中文逗号）
                tags = item.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
              }
            } else if (Array.isArray(item.tags)) {
              tags = item.tags;
            }
          }
          return {
            ...item,
            categoryName: this.data.categoryMap[item.categoryId] || '未分类',
            tags: tags // 确保tags是数组格式
          };
        });
        this.setData({ itemOverviews: items });
        this.filterItemOverviews();
      }
    } catch (error) {
      console.error('加载物品总览失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const response = await itemCategoryApi.getAll();
      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [];
        // 创建分类映射，方便根据ID查找分类名称
        const categoryMap = {};
        categories.forEach(category => {
          categoryMap[category.id] = category.name;
        });
        // 构建分类筛选器的选项数组：['全部', '分类1', '分类2', ...]
        const categoryRange = ['全部', ...categories.map(cat => cat.name)];
        // 构建创建物品用的分类名称数组（不包含"全部"）
        const categoryNames = categories.map(cat => cat.name);
        this.setData({ 
          categories: categories,
          categoryMap: categoryMap,
          categoryRange: categoryRange,
          categoryNames: categoryNames
        });
      } else {
        this.setData({ 
          categories: [], 
          categoryMap: {},
          categoryRange: ['全部'],
          categoryNames: []
        });
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      this.setData({ 
        categories: [], 
        categoryMap: {},
        categoryRange: ['全部'],
        categoryNames: []
      });
    }
  },

  // 筛选物品总览
  filterItemOverviews() {
    let filtered = this.data.itemOverviews;
    
    // 按分类筛选
    if (this.data.selectedCategoryId !== null) {
      filtered = filtered.filter(item => item.categoryId === this.data.selectedCategoryId);
    }
    
    // 按状态筛选 (is_active: 1=激活, 0=禁用)
    if (this.data.itemOverviewStatusFilter !== null) {
      const statusValue = this.data.itemOverviewStatusFilter;
      filtered = filtered.filter(item => {
        // 兼容 Boolean 和 Number 类型
        const itemStatus = item.isActive === true || item.isActive === 1 ? 1 : 0;
        return itemStatus === statusValue;
      });
    }
    
    // 按关键词搜索
    if (this.data.itemOverviewSearchKeyword) {
      const keyword = this.data.itemOverviewSearchKeyword.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          (item.name && item.name.toLowerCase().includes(keyword)) ||
          (item.description && item.description.toLowerCase().includes(keyword))
        );
      });
    }
    
    this.setData({ filteredItemOverviews: filtered });
  },

  // 物品总览搜索输入
  onItemOverviewSearchInput(e) {
    this.setData({ itemOverviewSearchKeyword: e.detail.value });
    this.filterItemOverviews();
  },

  // 分类筛选变化
  onCategoryFilterChange(e) {
    const value = parseInt(e.detail.value);
    // value: 0=全部, 1,2,3...=具体分类索引
    // 转换为: null=全部, 具体ID=分类ID
    const categoryId = value === 0 ? null : this.data.categories[value - 1].id;
    this.setData({ 
      selectedCategoryId: categoryId,
      categoryFilterIndex: value
    });
    this.filterItemOverviews();
  },

  // 状态筛选变化
  onItemOverviewStatusFilterChange(e) {
    const value = parseInt(e.detail.value);
    // value: 0=全部, 1=激活, 2=禁用
    // 转换为: null=全部, 1=激活, 0=禁用
    const statusValue = value === 0 ? null : (value === 1 ? 1 : 0);
    this.setData({ 
      itemOverviewStatusFilter: statusValue
    });
    this.filterItemOverviews();
  },

  // 查看物品总览详情
  viewItemOverviewDetail(e) {
    const item = e.currentTarget.dataset.item;
    // 处理tags：如果是字符串，解析为数组；如果已经是数组，直接使用
    let tags = [];
    if (item.tags) {
      if (typeof item.tags === 'string') {
        try {
          tags = JSON.parse(item.tags);
        } catch (e) {
          // 如果解析失败，尝试按逗号分割
          tags = item.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      } else if (Array.isArray(item.tags)) {
        tags = item.tags;
      }
    }
    // 确保有分类名称和正确的tags格式
    const itemWithCategory = {
      ...item,
      categoryName: this.data.categoryMap[item.categoryId] || '未分类',
      tags: tags
    };
    this.setData({
      selectedItemOverview: itemWithCategory,
      itemOverviewDetailVisible: true
    });
  },

  // 关闭物品总览详情
  closeItemOverviewDetail() {
    this.setData({
      itemOverviewDetailVisible: false,
      selectedItemOverview: null
    });
  },

  // ========== 创建物品总览 ==========
  
  // 打开创建物品对话框
  makeOverviews() {
    this.resetItemOverviewForm();
    this.setData({
      itemOverviewCreateVisible: true
    });
  },
  
  // 重置物品总览表单
  resetItemOverviewForm() {
    this.setData({
      itemOverviewForm: {
        id: null,
        name: '',
        categoryId: null,
        categoryName: '',
        description: '',
        imageUrl: '',
        tags: [],
        isActive: 1
      },
      tagsInput: '',
      crawledImages: [],
      currentImageIndex: 0,
      generatingImage: false,
      selectedCategoryIndex: -1
    });
  },

  // 关闭创建物品对话框
  closeItemOverviewCreate() {
    // 如果是编辑模式，确认是否取消
    if (this.data.itemOverviewForm.id) {
      wx.showModal({
        title: '确认取消',
        content: '确定要取消编辑吗？未保存的修改将丢失',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              itemOverviewCreateVisible: false
            });
            this.resetItemOverviewForm();
          }
        }
      });
    } else {
      // 创建模式，直接关闭
      this.setData({
        itemOverviewCreateVisible: false
      });
      this.resetItemOverviewForm();
    }
  },

  // 物品名称输入
  onItemNameInput(e) {
    this.setData({
      'itemOverviewForm.name': e.detail.value
    });
  },

  // 物品类别选择
  onItemCategoryChange(e) {
    const index = parseInt(e.detail.value);
    // categoryNames 对应的是 categories 数组，所以index直接对应
    if (index >= 0 && index < this.data.categories.length) {
      const category = this.data.categories[index];
      this.setData({
        'itemOverviewForm.categoryId': category.id,
        'itemOverviewForm.categoryName': category.name,
        selectedCategoryIndex: index
      });
    }
  },

  // 标签输入
  onTagsInput(e) {
    const inputValue = e.detail.value;
    this.setData({
      tagsInput: inputValue
    });
    // 实时解析标签并更新到 form 中（用于预览）
    if (inputValue && inputValue.trim()) {
      const tags = inputValue.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
      this.setData({
        'itemOverviewForm.tags': tags
      });
    } else {
      this.setData({
        'itemOverviewForm.tags': []
      });
    }
  },

  // 物品描述输入
  onItemDescriptionInput(e) {
    this.setData({
      'itemOverviewForm.description': e.detail.value
    });
  },

  // 从相册选择图片
  chooseImageFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 这里可以上传到服务器，暂时直接使用本地路径
        // 实际项目中应该上传到服务器获取URL
        this.setData({
          'itemOverviewForm.imageUrl': tempFilePath,
          crawledImages: [],
          currentImageIndex: 0
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 从相机选择图片
  chooseImageFromCamera() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 这里可以上传到服务器，暂时直接使用本地路径
        // 实际项目中应该上传到服务器获取URL
        this.setData({
          'itemOverviewForm.imageUrl': tempFilePath,
          crawledImages: [],
          currentImageIndex: 0
        });
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  // 爬取图片
  async crawlImage() {
    const name = this.data.itemOverviewForm.name;
    if (!name || !name.trim()) {
      wx.showToast({
        title: '请先输入物品名称',
        icon: 'none'
      });
      return;
    }

    this.setData({ generatingImage: true });
    try {
      const response = await pictureCrawlerApi.search(name.trim(), 5);
      if (response.success && response.data && response.data.length > 0) {
        const images = response.data;
        this.setData({
          crawledImages: images,
          currentImageIndex: 0,
          'itemOverviewForm.imageUrl': images[0]
        });
        wx.showToast({
          title: `找到${images.length}张图片`,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '未找到相关图片',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('爬取图片失败:', error);
      wx.showToast({
        title: '爬取图片失败',
        icon: 'none'
      });
    } finally {
      this.setData({ generatingImage: false });
    }
  },

  // 切换爬取的图片
  switchCrawledImage() {
    const images = this.data.crawledImages;
    if (images.length <= 1) return;
    
    const nextIndex = (this.data.currentImageIndex + 1) % images.length;
    this.setData({
      currentImageIndex: nextIndex,
      'itemOverviewForm.imageUrl': images[nextIndex]
    });
  },

  // 提交创建/更新物品
  async submitItemOverviewCreate() {
    const form = this.data.itemOverviewForm;
    const isEditMode = !!form.id;
    
    // 验证必填项
    if (!form.name || !form.name.trim()) {
      wx.showToast({
        title: '请输入物品名称',
        icon: 'none'
      });
      return;
    }

    if (!form.categoryId) {
      wx.showToast({
        title: '请选择物品类别',
        icon: 'none'
      });
      return;
    }

    // 处理标签：将字符串转换为数组格式 ["证件", "优惠"]
    // 支持英文逗号 ',' 和中文逗号 '，' 分隔
    let tags = [];
    if (this.data.tagsInput && this.data.tagsInput.trim()) {
      // 使用正则表达式同时匹配英文逗号和中文逗号
      tags = this.data.tagsInput
        .split(/[,，]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else if (this.data.itemOverviewForm.tags && Array.isArray(this.data.itemOverviewForm.tags)) {
      // 如果 tagsInput 为空但 form.tags 有值，使用 form.tags
      tags = this.data.itemOverviewForm.tags;
    }

    // 构建请求数据
    const requestData = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      description: form.description ? form.description.trim() : null,
      imageUrl: form.imageUrl || null,
      tags: tags, // 数组格式：["证件", "优惠"]
      isActive: form.isActive !== undefined ? Boolean(form.isActive === 1 || form.isActive === true) : true
    };

    console.log(`${isEditMode ? '更新' : '创建'}物品请求数据:`, JSON.stringify(requestData));
    console.log('Tags数组:', tags);

    wx.showLoading({
      title: isEditMode ? '更新中...' : '创建中...',
      mask: true
    });

    try {
      let response;
      if (isEditMode) {
        // 更新物品
        response = await itemOverviewApi.update(form.id, requestData);
      } else {
        // 创建物品
        response = await itemOverviewApi.add(requestData);
      }
      wx.hideLoading();
      
      if (response.success) {
        wx.showToast({
          title: isEditMode ? '更新成功' : '创建成功',
          icon: 'success',
          duration: 2000
        });
        // 关闭对话框并重置表单
        this.setData({
          itemOverviewCreateVisible: false
        });
        this.resetItemOverviewForm();
        // 重新加载物品列表
        await this.loadItemOverviews();
      } else {
        wx.showToast({
          title: response.message || (isEditMode ? '更新失败' : '创建失败'),
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error(`${isEditMode ? '更新' : '创建'}物品失败:`, error);
      wx.showToast({
        title: `${isEditMode ? '更新' : '创建'}失败，请检查网络连接`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 编辑物品总览
  editItemOverview(e) {
    const item = e.currentTarget.dataset.item;
    console.log(item)
    if (!item) return;
    
    // 处理tags：转换为数组格式，然后转换为逗号分隔的字符串用于输入框
    let tagsArray = [];
    if (item.tags) {
      if (Array.isArray(item.tags)) {
        tagsArray = item.tags;
      } else if (typeof item.tags === 'string') {
        try {
          const parsed = JSON.parse(item.tags);
          if (Array.isArray(parsed)) {
            tagsArray = parsed;
          } else {
            // 如果不是JSON数组，尝试按逗号分割（支持英文和中文逗号）
            tagsArray = item.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
          }
        } catch (e) {
          // 解析失败，尝试按逗号分割（支持英文和中文逗号）
          tagsArray = item.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      }
    }
    // 将数组转换为逗号分隔的字符串用于输入框显示
    const tagsInput = tagsArray.join(',');
    
    // 找到分类索引
    let selectedCategoryIndex = -1;
    if (item.categoryId) {
      const categoryIndex = this.data.categories.findIndex(cat => cat.id === item.categoryId);
      if (categoryIndex >= 0) {
        selectedCategoryIndex = categoryIndex;
      }
    }
    
    this.setData({
      itemOverviewCreateVisible: true,
      itemOverviewForm: {
        id: item.id,
        name: item.name || '',
        categoryId: item.categoryId || null,
        categoryName: this.data.categoryMap[item.categoryId] || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        tags: tagsArray, // 保存为数组格式
        isActive: item.isActive === true || item.isActive === 1 ? 1 : 0
      },
      tagsInput: tagsInput, // 输入框显示为逗号分隔的字符串
      crawledImages: [],
      currentImageIndex: 0,
      generatingImage: false,
      selectedCategoryIndex: selectedCategoryIndex
    });
  },

  // 启用物品总览
  async enableItemOverview(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.itemOverviews.find(i => i.id === itemId);
    if (!item) return;
    
    try {
      const response = await itemOverviewApi.update(itemId, { ...item, isActive: 1 });
      if (response.success) {
        wx.showToast({
          title: '启用成功',
          icon: 'success'
        });
        await this.loadItemOverviews();
      }
    } catch (error) {
      console.error('启用物品失败:', error);
      wx.showToast({
        title: '启用失败',
        icon: 'none'
      });
    }
  },

  // 禁用物品总览
  async disableItemOverview(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.itemOverviews.find(i => i.id === itemId);
    if (!item) return;
    
    wx.showModal({
      title: '确认禁用',
      content: '确定要禁用该物品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await itemOverviewApi.update(itemId, { ...item, isActive: 0 });
            if (response.success) {
              wx.showToast({
                title: '禁用成功',
                icon: 'success'
              });
              await this.loadItemOverviews();
            }
          } catch (error) {
            console.error('禁用物品失败:', error);
            wx.showToast({
              title: '禁用失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  // 获取状态文本
  getStatusText(isStatus, isPublic) {
    if (!isPublic) return '无需审核';
    if (isStatus === null || isStatus === undefined) return '无需审核';
    if (isStatus === 0) return '待审核';
    if (isStatus === 1) return '已通过';
    if (isStatus === 2) return '已拒绝';
    return '未知';
  },

  // 获取性别文本
  getGenderText(gender) {
    const map = { 'male': '男', 'female': '女', 'other': '其他' };
    return map[gender] || gender || '-';
  },

  // 格式化生日：将数组格式 [2025, 11, 26] 转换为字符串格式 2025-11-26
  formatBirthday(birthday) {
    if (!birthday) return '';
    
    // 如果是数组格式 [year, month, day]
    if (Array.isArray(birthday) && birthday.length >= 3) {
      const year = birthday[0];
      const month = String(birthday[1]).padStart(2, '0');
      const day = String(birthday[2]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 如果已经是字符串格式，直接返回
    if (typeof birthday === 'string') {
      return birthday;
    }
    
    return '';
  },
  
  // 获取类型文本
  getTypeText(type) {
    const typeMap = {
      'tourism': '旅游',
      'business': '商务',
      'family': '探亲',
      'other': '其他'
    };
    return typeMap[type] || type || '-';
  },
  
  // 获取优先级文本
  getPriorityText(priority) {
    const priorityMap = {
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return priorityMap[priority] || priority || '-';
  },

  // 处理图片加载错误
  handleImageError() {
    // 静默处理图片加载失败
    try {
      this.setData({
        'itemOverviewForm.imageUrl': ''
      });
      console.warn('图片加载失败，已清除');
    } catch (error) {
      // 静默失败，不抛出错误
      console.warn('处理图片错误失败:', error);
    }
  }
});

