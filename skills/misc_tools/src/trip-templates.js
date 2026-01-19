const { tripTemplateApi, templateItemApi, itemOverviewApi } = require('../../utils/api.js');
const { isLoggedIn, getCurrentUserId, isGuestMode } = require('../../utils/auth.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

const CATEGORY_OPTIONS = [
  { label: '全部分类', value: '' },
  { label: '证件类', value: 'DOCUMENTS' },
  { label: '衣物类', value: 'CLOTHING' },
  { label: '电子设备', value: 'ELECTRONICS' },
  { label: '洗漱用品', value: 'TOILETRIES' },
  { label: '药品类', value: 'MEDICINE' },
  { label: '食品类', value: 'FOOD' },
  { label: '户外用品', value: 'OUTDOOR' },
  { label: '办公用品', value: 'OFFICE' },
  { label: '安全用品', value: 'SAFETY' },
  { label: '其他用品', value: 'OTHERS' }
];

Page({
  data: {
    statusBarHeight: 44,
    activeTab: 'mine', // mine | public
    isEditorOpen: false,
    editingId: null,
    
    // 模板数据
    publicTemplates: [],
    myTemplates: [],
    displayTemplates: [], // 当前展示的列表
    loading: false,
    
    // 表单数据
    formData: {
      name: '',
      destination: '',
      duration: '',
      type: 'tourism',
      description: '',
      isPublic: false
    },
    tripTypes: [
      { label: '旅游', value: 'tourism' },
      { label: '商务', value: 'business' },
      { label: '探亲', value: 'family' },
      { label: '其他', value: 'other' }
    ],
    
    // 旧版数据（保留用于API调用）
    showCreateDialog: false,
    submittingTemplate: false,
    detailDialogVisible: false,
    detailTemplate: null,
    detailItems: [],
    detailLoading: false,
    detailDisabledItemsCount: 0,
    detailDisabledItems: [],
    newTemplate: {
      name: '',
      description: '',
      destination: '',
      duration: 3,
      type: 'tourism',
      tags: '',
      isPublic: false
    },
    newTemplateItems: [],
    allItemOverviews: [],
    filteredItemOverviews: [],
    selectedItemOverviewIds: [],
    itemOverviewFilter: {
      keyword: '',
      categoryId: null
    },
    loadingItems: false,
    selectedCategoryLabel: '全部分类',
    categoryIndexForAdd: 0,
    isEditMode: false,
    editingTemplateId: null,
    typeOptions: [
      { label: '旅游', value: 'tourism' },
      { label: '商务', value: 'business' },
      { label: '探亲', value: 'family' },
      { label: '其他', value: 'other' }
    ],
    currentTypeLabel: '旅游',
    stats: {
      mine: 0,
      public: 0
    },
    typeLabelMap: {
      tourism: '旅游',
      business: '商务',
      family: '探亲',
      other: '其他'
    },
    categoryOptionsForAdd: CATEGORY_OPTIONS,
    
    // Icons (Base64)
    iconChevronLeft: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2MzYzNjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTE1IDE4LTYtNiA2LTYiLz48L3N2Zz4=",
    iconPlusSm: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGY0NmU1IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDV2MTRtLTcgLTdoMTQiLz48L3N2Zz4=",
    iconPen: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE3IDNhMi44NSAyLjgzIDAgMSAxIDQgNEw3LjUgMjAuNSAyIDIybDEuNS01LjVMMTcgM1oiLz48L3N2Zz4=",
    iconTrash: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgNmgxOG0tMiAwdjE0YzAgMS4xLS45IDItMiAyaC04Yy0xLjEgMC0yLS45LTItMnYtMTRtMyAwaDRtLTIgLTJ2Mm0tNSAwdjE0Ii8+PC9zdmc+",
    iconMapPin: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDEwYzAgNi04IDEyLTggMTJzLTgtNi04LTEyYTggOCAwIDAgMSAxNiAwWiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=",
    iconClock: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cG9seWxpbmUgcG9pbnRzPSIxMiA2IDEyIDEyIDE2IDE0Ii8+PC9zdmc+",
    iconCheckCircle: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDExLjA4VjEyYTExIDEwIDAgMSAxLTUuOTMtOS4xNCIvPjxwb2x5bGluZSBwb2ludHM9IjIyIDQgMTIgMTQuMDEgOSAxMS4wMSIvPjwvc3ZnPg==",
    iconClockSm: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cG9seWxpbmUgcG9pbnRzPSIxMiA2IDEyIDEyIDE2IDE0Ii8+PC9zdmc+",
    iconAlert: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjQzZjVlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTIxLjczIDE4LTgtMTRhMiAyIDAgMCAwLTMuNDggMGwtOCAxNEEyIDIgMCAwIDAgNCAyMWgxNmEyIDIgMCAwIDAgMS43My0zWiIvPjxsaW5lIHgxPSIxMiIgeTE9IjlIiB4Mj0iMTIiIHkyPSIxMyIvPjxsaW5lIHgxPSIxMiIgeTE9IjE3IiB4Mj0iMTIuMDEiIHkyPSIxNyIvPjwvc3ZnPg==",
    iconLayout: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIzIiB5PSIzIiByeD0iMiIgcnk9IjIiLz48bGluZSB4MT0iMyIgeDI9IjIxIiB5MT0iOSIgeTI9IjkiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSIyMSIgeTI9IjkiLz48L3N2Zz4=",
    iconPlusLg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjEyIiB5MT0iNSIgeDI9IjEyIiB5Mj0iMTkiLz48bGluZSB4MT0iNSIgeTE9IjEyIiB4Mj0iMTkiIHkyPSIxMiIvPjwvc3ZnPg=="
  },
  
  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight });
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.loadTemplates();
  },
  
  onShow() {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    this.loadTemplates();
  },
  
  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab && tab !== this.data.activeTab) {
      this.setData({ activeTab: tab });
      this.filterTemplates();
    }
  },
  
  // 过滤模板列表
  filterTemplates() {
    const { myTemplates, publicTemplates, activeTab } = this.data;
    const list = activeTab === 'mine' ? myTemplates : publicTemplates;
    this.setData({ displayTemplates: list });
  },
  
  // 弹窗相关（新UI）
  openTemplateEditor() {
    this.setData({
      isEditorOpen: true,
      editingId: null,
      formData: { name: '', destination: '', duration: '', type: 'tourism', description: '', isPublic: false },
      selectedItemOverviewIds: [],
      newTemplateItems: []
    });
    // 加载物品列表（用于选择）
    this.loadItemOverviews();
  },
  
  async editTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const userId = getCurrentUserId();
    if (!id || !userId) return;
    
    try {
      // 加载模板信息
      const templateResp = await tripTemplateApi.getById(id, userId);
      if (!templateResp.success || !templateResp.data) {
        wx.showToast({ title: '加载模板失败', icon: 'none' });
        return;
      }
      
      const template = templateResp.data;
      
      // 加载模板物品
      const itemsResp = await templateItemApi.getByTemplateId(id);
      const templateItems = itemsResp.success ? (itemsResp.data || []) : [];
      
      // 设置已选中的物品ID
      const selectedIds = [...new Set(templateItems.map(item => item.itemOverviewId).filter(id => id != null && id !== undefined).map(id => parseInt(id)))];
      
      // 先设置selectedItemOverviewIds，这样loadItemOverviews才能正确设置checked状态
      this.setData({ selectedItemOverviewIds: selectedIds });
      
      // 加载物品总览（会基于selectedIds设置checked状态）
      await this.loadItemOverviews();
      
      // 从已勾选的物品中构建newTemplateItems
      const newTemplateItems = this.data.allItemOverviews
        .filter(item => item.checked)
        .map(item => {
          const templateItem = templateItems.find(ti => ti.itemOverviewId === item.itemOverviewId);
          return {
            itemOverviewId: item.itemOverviewId,
            name: item.name,
            categoryId: item.categoryId,
            categoryText: item.categoryText,
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            tags: item.tags || [],
            note: templateItem ? (templateItem.note || '') : '',
            priority: templateItem ? (templateItem.priority || 'medium') : 'medium'
          };
        });
      
      // 转换数据格式
      this.setData({
        isEditorOpen: true,
        editingId: id,
        formData: {
          name: template.name || '',
          destination: template.destination || '',
          duration: template.duration || '',
          type: template.type || 'tourism',
          description: template.description || '',
          isPublic: template.isPublic || template.is_public === 1 || template.is_public === true
        },
        newTemplateItems: newTemplateItems,
        selectedItemOverviewIds: selectedIds
      });
    } catch (error) {
      console.error('加载模板失败', error);
      wx.showToast({ title: '加载模板失败', icon: 'none' });
    }
  },
  
  closeEditor() {
    this.setData({ 
      isEditorOpen: false,
      selectedItemOverviewIds: [],
      newTemplateItems: []
    });
  },
  
  // 打开物品选择器（复用旧版弹窗）
  async openItemSelector() {
    // 如果还没有加载物品列表，先加载
    if (this.data.allItemOverviews.length === 0) {
      await this.loadItemOverviews();
    }
    // 打开旧版弹窗（包含物品选择功能）
    this.setData({ 
      showCreateDialog: true,
      isEditMode: !!this.data.editingId,
      editingTemplateId: this.data.editingId
    });
  },
  
  // 移除已选物品
  removeItem(e) {
    const itemId = parseInt(e.currentTarget.dataset.id);
    const selectedIds = this.data.selectedItemOverviewIds.filter(id => id !== itemId);
    const newItems = this.data.newTemplateItems.filter(item => item.itemOverviewId !== itemId);
    
    // 更新所有物品的checked状态
    const updatedItems = this.data.allItemOverviews.map(item => ({
      ...item,
      checked: selectedIds.includes(item.id)
    }));
    
    this.setData({
      selectedItemOverviewIds: selectedIds,
      newTemplateItems: newItems,
      allItemOverviews: updatedItems,
      filteredItemOverviews: updatedItems.filter(item => {
        const { itemOverviewFilter } = this.data;
        if (itemOverviewFilter.keyword) {
          const keyword = itemOverviewFilter.keyword.toLowerCase();
          if (!item.name.toLowerCase().includes(keyword) && 
              !(item.description && item.description.toLowerCase().includes(keyword))) {
            return false;
          }
        }
        if (itemOverviewFilter.categoryId) {
          if (item.categoryId !== itemOverviewFilter.categoryId) {
            return false;
          }
        }
        return true;
      })
    });
  },
  
  // 表单输入（新UI）
  onInputName(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'formData.name': '' });
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none', duration: 2000 });
      return;
    }
    this.setData({ 'formData.name': value });
  },
  
  onInputDest(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'formData.destination': '' });
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none', duration: 2000 });
      return;
    }
    this.setData({ 'formData.destination': value });
  },
  
  onInputDuration(e) {
    const value = parseInt(e.detail.value, 10);
    this.setData({ 'formData.duration': value > 0 ? value : '' });
  },
  
  onInputDesc(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'formData.description': '' });
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none', duration: 2000 });
      return;
    }
    this.setData({ 'formData.description': value });
  },
  
  selectType(e) {
    this.setData({ 'formData.type': e.currentTarget.dataset.value });
  },
  
  togglePublic() {
    this.setData({ 'formData.isPublic': !this.data.formData.isPublic });
  },
  
  // 保存模板（新UI）
  saveTemplate() {
    const { formData, editingId } = this.data;
    if (!formData.name || !formData.name.trim()) {
      wx.showToast({ title: '请输入模板名称', icon: 'none' });
      return;
    }
    
    // 检测敏感词
    if (containsSensitiveWord(formData.name)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none', duration: 2000 });
      return;
    }
    if (formData.destination && containsSensitiveWord(formData.destination)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none', duration: 2000 });
      return;
    }
    if (formData.description && containsSensitiveWord(formData.description)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none', duration: 2000 });
      return;
    }
    
    // 转换为旧版格式并调用API
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请重新登录', icon: 'none' });
      return;
    }
    
    // 同步到旧版数据格式
    this.setData({
      newTemplate: {
        name: formData.name,
        description: formData.description,
        destination: formData.destination,
        duration: parseInt(formData.duration) || 3,
        type: formData.type,
        tags: '',
        isPublic: formData.isPublic
      },
      isEditMode: !!editingId,
      editingTemplateId: editingId
    });
    
    // 调用旧版保存方法（保留API逻辑）
    this.submitTemplate();
    
    // 关闭编辑器
    this.setData({ isEditorOpen: false });
  },
  
  // 删除模板（新UI）
  deleteTemplate(e) {
    const id = e.currentTarget.dataset.id;
    const userId = getCurrentUserId();
    if (!id || !userId) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个模板吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const resp = await tripTemplateApi.delete(id, userId);
          if (resp.success) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadTemplates();
          } else {
            wx.showToast({ title: resp.message || '删除失败', icon: 'none' });
          }
        } catch (error) {
          console.error('删除模板失败', error);
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },
  
  goBack() {
    wx.navigateBack();
  },

  async openCreateDialog() {
    // 游客模式拦截
    if (isGuestMode()) {
      wx.showModal({
        title: '游客模式',
        content: '当前属于游客模式，不能新建模板，请你退出后授权登录',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    this.resetTemplateForm();
    this.setData({ 
      showCreateDialog: true,
      isEditMode: false,
      editingTemplateId: null
    });
    await this.loadItemOverviews();
  },

  async openEditDialog(e) {
    const templateId = e.currentTarget.dataset.id;
    const userId = getCurrentUserId();
    if (!templateId || !userId) return;
    
    try {
      // 加载模板信息
      const templateResp = await tripTemplateApi.getById(templateId, userId);
      if (!templateResp.success || !templateResp.data) {
        wx.showToast({
          title: '加载模板失败',
          icon: 'none'
        });
        return;
      }
      
      const template = templateResp.data;
      
      // 加载模板物品
      const itemsResp = await templateItemApi.getByTemplateId(templateId);
      const templateItems = itemsResp.success ? (itemsResp.data || []) : [];
      
      // 设置已选中的物品ID（确保是数字数组，且去重）
      const selectedIds = [...new Set(templateItems.map(item => item.itemOverviewId).filter(id => id != null && id !== undefined).map(id => parseInt(id)))];
      
      // 先设置selectedItemOverviewIds，这样loadItemOverviews才能正确设置checked状态
      this.setData({ selectedItemOverviewIds: selectedIds });
      
      // 加载物品总览（会基于selectedIds设置checked状态）
      await this.loadItemOverviews();
      
      // 从已勾选的物品中构建newTemplateItems（与handleItemCheckboxChange逻辑一致）
      const newTemplateItems = this.data.allItemOverviews
        .filter(item => item.checked)
        .map(item => {
          // 从templateItems中获取note和priority（如果有）
          const templateItem = templateItems.find(ti => ti.itemOverviewId === item.itemOverviewId);
          return {
            itemOverviewId: item.itemOverviewId,
            name: item.name,
            categoryId: item.categoryId,
            categoryText: item.categoryText,
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            tags: item.tags || [],
            note: templateItem ? (templateItem.note || '') : '',
            priority: templateItem ? (templateItem.priority || 'medium') : 'medium'
          };
        });
      
      // 设置类型标签
      const typeOption = this.data.typeOptions.find(opt => opt.value === template.type);
      const currentTypeLabel = typeOption ? typeOption.label : '旅游';
      
      this.setData({
        newTemplate: {
          name: template.name || '',
          description: template.description || '',
          destination: template.destination || '',
          duration: template.duration || 3,
          type: template.type || 'tourism',
          tags: template.tags || '',
          isPublic: template.isPublic || false
        },
        newTemplateItems: newTemplateItems,
        selectedItemOverviewIds: selectedIds,
        currentTypeLabel: currentTypeLabel,
        showCreateDialog: true,
        isEditMode: true,
        editingTemplateId: templateId
      });
    } catch (error) {
      console.error('加载模板失败', error);
      wx.showToast({
        title: '加载模板失败',
        icon: 'none'
      });
    }
  },

  closeCreateDialog() {
    this.setData({ showCreateDialog: false });
  },

  resetTemplateForm() {
    this.setData({
      newTemplate: {
        name: '',
        description: '',
        destination: '',
        duration: 3,
        type: 'tourism',
        tags: '',
        isPublic: false
      },
      newTemplateItems: [],
      selectedItemOverviewIds: [],
      itemOverviewFilter: {
        keyword: '',
        categoryId: null
      },
      selectedCategoryLabel: '全部分类',
      categoryIndexForAdd: 0,
      currentTypeLabel: '旅游',
      isEditMode: false,
      editingTemplateId: null
    });
  },

  handleTemplateInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    // 敏感词检测（只检测文本字段）
    if (field === 'name' || field === 'description' || field === 'destination' || field === 'tags') {
      if (containsSensitiveWord(value)) {
        // 清空输入
        this.setData({
          [`newTemplate.${field}`]: ''
        });
        // 提示用户
        wx.showToast({
          title: '有敏感词请重新输入',
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    this.setData({
      [`newTemplate.${field}`]: value
    });
  },

  handleDurationChange(e) {
    const value = parseInt(e.detail.value, 10);
    this.setData({
      'newTemplate.duration': value > 0 ? value : 1
    });
  },

  handleTypeChange(e) {
    const index = e.detail.value;
    const option = this.data.typeOptions[index] || this.data.typeOptions[0];
    this.setData({
      'newTemplate.type': option.value,
      currentTypeLabel: option.label
    });
  },

  handleIsPublicChange(e) {
    this.setData({
      'newTemplate.isPublic': e.detail.value
    });
  },


  async loadItemOverviews() {
    this.setData({ loadingItems: true });
    try {
      const resp = await itemOverviewApi.getAll();
      if (resp.success && resp.data) {
        const selectedIds = this.data.selectedItemOverviewIds || [];
        // 构建物品列表：每个物品都有checked属性（照搬checklist的逻辑）
        const items = (resp.data || []).map(itemOverview => {
          // 检查该物品是否在已选列表中（已勾选）
          const isChecked = selectedIds.includes(itemOverview.id);
          
          return {
            id: itemOverview.id,
            itemOverviewId: itemOverview.id,
            name: itemOverview.name,
            categoryId: itemOverview.categoryId,
            categoryText: this.getCategoryTextByCategoryId(itemOverview.categoryId),
            description: itemOverview.description || '',
            imageUrl: itemOverview.imageUrl || '',
            tags: itemOverview.tags || [],
            checked: isChecked
          };
        });
        
        this.setData({ 
          allItemOverviews: items,
          filteredItemOverviews: items,
          loadingItems: false
        });
      } else {
        this.setData({ loadingItems: false });
        wx.showToast({
          title: '加载物品失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载物品总览失败', error);
      this.setData({ loadingItems: false });
      wx.showToast({
        title: '加载物品失败',
        icon: 'none'
      });
    }
  },

  getCategoryTextByCategoryId(categoryId) {
    const categoryMap = {
      1: '证件类',
      2: '衣物类',
      3: '电子设备',
      4: '洗漱用品',
      5: '药品类',
      6: '食品类',
      7: '户外用品',
      8: '办公用品',
      9: '安全用品',
      10: '其他用品'
    };
    return categoryMap[categoryId] || '其他用品';
  },

  updateFilteredItemOverviews() {
    const { allItemOverviews, itemOverviewFilter } = this.data;
    let filtered = [...allItemOverviews];
    
    if (itemOverviewFilter.keyword) {
      const keyword = itemOverviewFilter.keyword.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      );
    }
    
    if (itemOverviewFilter.categoryId) {
      filtered = filtered.filter(item => item.categoryId === itemOverviewFilter.categoryId);
    }
    
    // 保持checked状态
    this.setData({ filteredItemOverviews: filtered });
  },

  handleItemOverviewFilter(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`itemOverviewFilter.${field}`]: value
    }, () => {
      this.updateFilteredItemOverviews();
    });
  },

  handleItemOverviewCategoryFilter(e) {
    const index = parseInt(e.detail.value) || 0;
    const option = this.data.categoryOptionsForAdd[index];
    // categoryId从1开始，index=0表示全部分类
    const categoryId = index > 0 ? index : null;
    const categoryLabel = option ? option.label : '全部分类';
    this.setData({
      'itemOverviewFilter.categoryId': categoryId,
      selectedCategoryLabel: categoryLabel,
      categoryIndexForAdd: index
    }, () => {
      this.updateFilteredItemOverviews();
    });
  },

  resetItemOverviewFilter() {
    this.setData({
      itemOverviewFilter: {
        keyword: '',
        categoryId: null
      },
      selectedCategoryLabel: '全部分类',
      categoryIndexForAdd: 0
    }, () => {
      this.updateFilteredItemOverviews();
    });
  },

  // 更新物品勾选状态（照搬checklist的updateItemStatus逻辑）
  handleItemCheckboxChange(e) {
    const values = e.detail.value || [];
    
    // 找到所有被勾选的itemId（转换为数字和字符串两种格式以便匹配）
    const checkedItemIds = values.map(v => {
      const num = parseInt(v);
      return isNaN(num) ? v : num;
    });
    
    // 遍历所有物品，判断哪些需要勾选，哪些需要取消勾选
    const itemsToCheck = [];
    const itemsToUncheck = [];
    
    this.data.allItemOverviews.forEach(item => {
      // 获取item的唯一标识（checkbox的value使用的是itemOverviewId或item.id）
      const itemIdentifier = item.itemOverviewId || item.id;
      
      // 检查itemIdentifier是否在checkedItemIds中（支持数字和字符串匹配）
      const isChecked = checkedItemIds.some(id => {
        const idNum = typeof id === 'string' ? parseInt(id) : id;
        const identifierNum = typeof itemIdentifier === 'string' ? parseInt(itemIdentifier) : itemIdentifier;
        return id === itemIdentifier || 
               idNum === itemIdentifier || 
               id === itemIdentifier.toString() || 
               idNum === identifierNum;
      });
      
      if (item.checked && !isChecked) {
        // 当前已勾选，但不在新的勾选列表中 => 需要取消勾选
        itemsToUncheck.push(item);
      } else if (!item.checked && isChecked) {
        // 当前未勾选，但在新的勾选列表中 => 需要勾选
        itemsToCheck.push(item);
      }
    });
    
    // 更新所有物品的checked状态
    const updatedItems = this.data.allItemOverviews.map(item => {
      const itemIdentifier = item.itemOverviewId || item.id;
      const isChecked = checkedItemIds.some(id => {
        const idNum = typeof id === 'string' ? parseInt(id) : id;
        const identifierNum = typeof itemIdentifier === 'string' ? parseInt(itemIdentifier) : itemIdentifier;
        return id === itemIdentifier || 
               idNum === itemIdentifier || 
               id === itemIdentifier.toString() || 
               idNum === identifierNum;
      });
      return {
        ...item,
        checked: isChecked
      };
    });
    
    // 更新筛选后的物品列表
    const updatedFilteredItems = this.data.filteredItemOverviews.map(item => {
      const itemIdentifier = item.itemOverviewId || item.id;
      const isChecked = checkedItemIds.some(id => {
        const idNum = typeof id === 'string' ? parseInt(id) : id;
        const identifierNum = typeof itemIdentifier === 'string' ? parseInt(itemIdentifier) : itemIdentifier;
        return id === itemIdentifier || 
               idNum === itemIdentifier || 
               id === itemIdentifier.toString() || 
               idNum === identifierNum;
      });
      return {
        ...item,
        checked: isChecked
      };
    });
    
    // 更新selectedItemOverviewIds和newTemplateItems
    const selectedIds = checkedItemIds.filter(id => {
      const idNum = typeof id === 'string' ? parseInt(id) : id;
      return !isNaN(idNum);
    });
    
    // 根据checked状态更新newTemplateItems
    const newTemplateItems = updatedItems
      .filter(item => item.checked)
      .map(item => ({
        itemOverviewId: item.id,
        name: item.name,
        categoryId: item.categoryId,
        categoryText: item.categoryText,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        tags: item.tags || [],
        note: '',
        priority: 'medium'
      }));
    
    this.setData({ 
      allItemOverviews: updatedItems,
      filteredItemOverviews: updatedFilteredItems,
      selectedItemOverviewIds: selectedIds,
      newTemplateItems: newTemplateItems
    });
    
    // 如果新UI编辑器是打开的，同步更新数据（确保新UI显示最新的已选物品）
    if (this.data.isEditorOpen) {
      this.setData({
        selectedItemOverviewIds: selectedIds,
        newTemplateItems: newTemplateItems
      });
    }
  },

  
  async submitTemplate() {
    if (this.data.submittingTemplate) return;
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({
        title: '请重新登录',
        icon: 'none'
      });
      return;
    }
    const { newTemplate, newTemplateItems } = this.data;
    if (!newTemplate.name.trim()) {
      wx.showToast({
        title: '请输入模板名称',
        icon: 'none'
      });
      return;
    }
    
    // 检测敏感词
    if (containsSensitiveWord(newTemplate.name)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (newTemplate.destination && containsSensitiveWord(newTemplate.destination)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (newTemplate.description && containsSensitiveWord(newTemplate.description)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (newTemplate.tags && containsSensitiveWord(newTemplate.tags)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
      const validItems = newTemplateItems.filter(item => item.name && item.name.trim());
      if (validItems.length === 0) {
        wx.showToast({
          title: '至少添加一件物品',
          icon: 'none'
        });
        return;
      }
    
    this.setData({ submittingTemplate: true });
    try {
      const { isEditMode, editingTemplateId } = this.data;
      let templateId;
      
      if (isEditMode && editingTemplateId) {
        // 编辑模式：更新模板
        const payload = {
          ...newTemplate,
          isPublic: newTemplate.isPublic ? true : false,
          duration: Number(newTemplate.duration) || 1
        };
        // 如果修改为公开模板，is_status改为0（需要重新审核）
        if (payload.isPublic) {
          payload.isStatus = 0;
        }
        const updateResp = await tripTemplateApi.update(editingTemplateId, userId, payload);
        if (!updateResp.success) {
          wx.showToast({
            title: updateResp.message || '更新失败',
            icon: 'none'
          });
          this.setData({ submittingTemplate: false });
          return;
        }
        templateId = editingTemplateId;
        
        // 删除所有现有物品，然后重新添加
        const existingItemsResp = await templateItemApi.getByTemplateId(templateId);
        if (existingItemsResp.success && existingItemsResp.data) {
          const deleteTasks = existingItemsResp.data.map(item => 
            templateItemApi.delete(item.id, userId)
          );
          await Promise.all(deleteTasks);
        }
      } else {
        // 创建模式：新建模板
        const payload = {
          ...newTemplate,
          createdBy: userId,
          isPublic: newTemplate.isPublic ? true : false,
          duration: Number(newTemplate.duration) || 1
        };
        const resp = await tripTemplateApi.create(payload);
        if (!resp.success) {
          wx.showToast({
            title: resp.message || '创建失败',
            icon: 'none'
          });
          this.setData({ submittingTemplate: false });
          return;
        }
        templateId = resp.data?.id;
      }
      
      // 添加物品
      if (templateId) {
        const tasks = [];
        validItems.forEach(item => {
          tasks.push(
            templateItemApi.add(userId, {
              templateId,
              name: item.name.trim(),
              note: item.note || '',
              priority: item.priority || 'medium',
              categoryId: item.categoryId || null,
              itemOverviewId: item.itemOverviewId || null
            })
          );
        });
        if (tasks.length > 0) {
          const results = await Promise.all(tasks);
          // 检查是否有失败的
          const failed = results.some(r => !r.success);
          if (failed) {
            wx.showToast({
              title: '部分物品添加失败',
              icon: 'none'
            });
          }
        }
      }
      wx.showToast({
        title: isEditMode ? '模板更新成功' : '模板创建成功',
        icon: 'success'
      });
      this.closeCreateDialog();
      this.loadTemplates();
    } catch (error) {
      console.error('创建模板失败', error);
      wx.showToast({
        title: '创建失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      this.setData({ submittingTemplate: false });
    }
  },

  async deleteTemplate(e) {
    const templateId = e.currentTarget.dataset.id;
    const userId = getCurrentUserId();
    if (!templateId || !userId) return;
    wx.showModal({
      title: '删除模板',
      content: '确认删除该模板及其物品？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const resp = await tripTemplateApi.delete(templateId, userId);
          if (resp.success) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadTemplates();
          } else {
            wx.showToast({ title: resp.message || '删除失败', icon: 'none' });
          }
        } catch (error) {
          console.error('删除模板失败', error);
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },

  // switchTab 已在上方定义

  decorateTemplate(template, scope) {
    const typeLabel = this.data.typeLabelMap[template.type] || '其他';
    let statusLabel = '';
    let status = ''; // 'pending', 'approved', 'rejected' (用于新UI)
    let statusType = ''; // 'private', 'pending', 'approved', 'rejected' (用于旧UI)
    let rejectReason = '';
    let publicLabel = ''; // '个人' 或 '公开'
    let isPublic = false; // 默认值，会在下面根据scope设置
    
    if (scope === 'mine') {
      // 我的模板：显示个人/公开状态和审核状态
      // is_public: 0=个人，1=公开
      // 优先使用 is_public，如果没有则使用 isPublic
      const isPublicValue = template.is_public !== undefined ? template.is_public : (template.isPublic !== undefined ? template.isPublic : 0);
      isPublic = isPublicValue === 1 || isPublicValue === true;
      
      // 优先使用 is_status，如果没有则使用 isStatus
      const isStatus = template.is_status !== undefined ? template.is_status : (template.isStatus !== undefined ? template.isStatus : null);
      const result = template.result || '';
      
      // 设置公开/个人标签
      publicLabel = isPublic ? '公开' : '个人';
      
      if (!isPublic) {
        // 未公开，显示个人模板
        statusLabel = '个人模板';
        statusType = 'private';
        status = 'pending'; // 默认状态
      } else {
        // is_public=1的情况，显示审核状态
        // is_status: 0=未审核，1=通过，2=拒绝
        if (isStatus === 0 || isStatus === '0') {
          statusLabel = '未审核';
          statusType = 'pending';
          status = 'pending';
        } else if (isStatus === 1 || isStatus === '1') {
          statusLabel = '审核通过';
          statusType = 'approved';
          status = 'approved';
        } else if (isStatus === 2 || isStatus === '2') {
          statusLabel = '审核拒绝';
          statusType = 'rejected';
          status = 'rejected';
          rejectReason = result;
        } else if (isStatus === null || isStatus === undefined) {
          // 如果 is_status 为 null 或 undefined，可能是新创建的公开模板，默认为未审核
          statusLabel = '未审核';
          statusType = 'pending';
          status = 'pending';
        } else {
          // 其他情况，默认为未审核
          statusLabel = '未审核';
          statusType = 'pending';
          status = 'pending';
        }
      }
    } else {
      // 公共模板
      publicLabel = '公开';
      statusLabel = '公共模板';
      statusType = 'public';
      status = 'approved'; // 公共模板默认已审核通过
      isPublic = true; // 公共模板默认是公开的
    }
    
    // 处理tags：如果是字符串则转换为数组
    let tags = template.tags || [];
    if (typeof tags === 'string') {
      // 如果是逗号分隔的字符串，分割成数组
      tags = tags.split(',').filter(t => t && t.trim()).map(t => t.trim());
    } else if (Array.isArray(tags)) {
      // 确保数组中的每个元素都是字符串，过滤掉空值
      tags = tags.filter(t => t != null && t !== '').map(t => String(t).trim()).filter(t => t);
    } else {
      // 如果不是数组也不是字符串，设为空数组
      tags = [];
    }
    
    return {
      ...template,
      typeLabel,
      durationLabel: template.duration ? `${template.duration}天` : '未设置',
      scopeLabel: statusLabel,
      status: status, // 新UI使用
      statusType: statusType, // 旧UI使用
      rejectReason: rejectReason,
      publicLabel: publicLabel,
      isPublic: isPublic, // 新UI使用
      isPublicValue: template.isPublic !== undefined ? template.isPublic : (template.is_public !== undefined ? template.is_public : 0),
      isStatusValue: template.isStatus !== undefined ? template.isStatus : (template.is_status !== undefined ? template.is_status : null),
      resultValue: template.result || '',
      tags: tags, // 确保是数组
      itemCount: template.itemCount || 0,
      author: scope === 'mine' ? 'me' : (template.createdBy === 'official' ? 'official' : 'user') // 新UI使用
    };
  },

  getCategoryIdByCode(category) {
    const map = {
      DOCUMENTS: 1,
      CLOTHING: 2,
      ELECTRONICS: 3,
      TOILETRIES: 4,
      MEDICINE: 5,
      FOOD: 6,
      OUTDOOR: 7,
      OFFICE: 8,
      SAFETY: 9,
      OTHERS: 10
    };
    return map[category] || 10;
  },

  getCategoryText(code) {
    const found = CATEGORY_OPTIONS.find(opt => opt.value === code);
    return found ? found.label : '未分类';
  },

  decorateNewTemplateItem(item) {
    const categoryCode = item.categoryCode || item.category;
    const categoryId = item.categoryId || this.getCategoryIdByCode(categoryCode);
    return {
      ...item,
      categoryCode,
      categoryId,
      categoryLabel: this.getCategoryText(categoryCode),
      priority: item.priority || 'medium'
    };
  },

  async loadTemplates() {
    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({
        title: '未获取到用户信息',
        icon: 'none'
      });
      return;
    }
    this.setData({ loading: true });
    try {
      const [publicResp, myResp] = await Promise.all([
        tripTemplateApi.getPublicTemplates(),
        tripTemplateApi.getByCreatedBy(userId, userId)
      ]);
      
      // 我的模板：所有created_by=当前用户的模板
      const mineList = (myResp.success ? (myResp.data || []) : []).map(item => this.decorateTemplate(item, 'mine'));
      
      // 公共模板：后端已经过滤了is_public=1且is_status=1的模板，直接使用
      const publicList = (publicResp.success ? (publicResp.data || []) : []).map(item => this.decorateTemplate(item, 'public'));
      
      // 为每个模板加载禁用物品信息和物品数量
      const mineListWithDisabled = await Promise.all(mineList.map(async (template) => {
        const templateWithDisabled = await this.loadDisabledItemsForTemplate(template);
        // 加载物品数量
        const itemsResp = await templateItemApi.getByTemplateId(template.id);
        const itemCount = itemsResp.success ? (itemsResp.data || []).length : 0;
        return { ...templateWithDisabled, itemCount };
      }));
      
      const publicListWithDisabled = await Promise.all(publicList.map(async (template) => {
        const templateWithDisabled = await this.loadDisabledItemsForTemplate(template);
        // 加载物品数量
        const itemsResp = await templateItemApi.getByTemplateId(template.id);
        const itemCount = itemsResp.success ? (itemsResp.data || []).length : 0;
        return { ...templateWithDisabled, itemCount };
      }));
      
      this.setData({
        myTemplates: mineListWithDisabled,
        publicTemplates: publicListWithDisabled,
        stats: {
          mine: mineListWithDisabled.length,
          public: publicListWithDisabled.length
        }
      });
      
      // 更新显示列表
      this.filterTemplates();
    } catch (error) {
      console.error('加载模板失败', error);
      wx.showToast({
        title: '加载模板失败',
        icon: 'none'
      });
    } finally {
      wx.stopPullDownRefresh();
      this.setData({ loading: false });
    }
  },

  // 为模板加载禁用物品信息
  async loadDisabledItemsForTemplate(template) {
    try {
      const resp = await templateItemApi.getByTemplateId(template.id);
      if (resp.success && resp.data) {
        const disabledItems = resp.data.filter(item => {
          return item.itemOverviewId != null && 
                 (item.isActive === false || item.isActive === 0);
        });
        return {
          ...template,
          disabledItemsCount: disabledItems.length,
          disabledItems: disabledItems.map(item => item.name || '未知物品')
        };
      }
    } catch (error) {
      console.error('加载模板禁用物品失败', error);
    }
    return {
      ...template,
      disabledItemsCount: 0,
      disabledItems: []
    };
  },

  async openTemplateDetail(e) {
    const template = e.currentTarget.dataset.template;
    if (!template) return;
    this.setData({
      detailTemplate: template,
      detailDialogVisible: true,
      detailItems: [],
      detailLoading: true,
      detailDisabledItemsCount: 0,
      detailDisabledItems: []
    });
    try {
      const userId = getCurrentUserId();
      // 重新获取模板的完整信息，确保包含最新的 is_status
      const templateResp = await tripTemplateApi.getById(template.id, userId);
      let fullTemplate = template;
      if (templateResp.success && templateResp.data) {
        // 使用最新的模板信息，并重新装饰以获取正确的状态
        fullTemplate = this.decorateTemplate(templateResp.data, 'mine');
        this.setData({ detailTemplate: fullTemplate });
      }
      
      // 获取模板物品
      const resp = await templateItemApi.getByTemplateId(template.id);
      const items = resp.success ? (resp.data || []) : [];
      
      // 检查并标记禁用物品
      const itemsWithDisabledFlag = items.map(item => {
        const isDisabled = item.itemOverviewId != null && 
                          (item.isActive === false || item.isActive === 0);
        return {
          ...item,
          isDisabled: isDisabled
        };
      });
      
      // 统计禁用物品数量和名称
      const disabledItems = itemsWithDisabledFlag.filter(item => item.isDisabled);
      const disabledCount = disabledItems.length;
      const disabledItemNames = disabledItems.map(item => item.name || '未知物品');
      
      this.setData({
        detailItems: itemsWithDisabledFlag,
        detailLoading: false,
        detailDisabledItemsCount: disabledCount,
        detailDisabledItems: disabledItemNames
      });
    } catch (error) {
      console.error('获取模板信息失败', error);
      this.setData({
        detailLoading: false
      });
      wx.showToast({
        title: '加载模板信息失败',
        icon: 'none'
      });
    }
  },

  closeDetailDialog() {
    this.setData({
      detailDialogVisible: false,
      detailItems: [],
      detailTemplate: null,
      detailDisabledItemsCount: 0,
      detailDisabledItems: []
    });
  },

  onPullDownRefresh() {
    this.loadTemplates();
  },
  
  stopPropagation() {}
});

