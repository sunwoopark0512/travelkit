// pages/checklist/checklist.js
const { itemApi, tripApi, itemOverviewApi } = require('../../utils/api.js');
const { isLoggedIn } = require('../../utils/auth.js');

Page({
  data: {
    tripId: null,
    trip: {},
    items: [], // 所有物品（从item_overview获取）
    filteredItems: [], // 筛选后的物品
    filterForm: {
      category: '',
      keyword: ''
    },
    checkedCount: 0, // 已勾选数量（items表中的数量）
    totalCount: 0, // 总物品数量（item_overview的数量）
    progressPercentage: 0,
    loading: false,
    categoryOptions: [
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
    ],
    selectedCategoryLabel: '全部分类',
    // 添加物品相关
    showAddItemDialog: false,
    addItemForm: {
      name: '',
      category: '',
      description: '',
      note: '',
      categoryIndex: 0
    },
    selectedCategoryLabelForAdd: '请选择分类',
    categoryOptionsWithoutAll: [], // 用于添加物品的picker，去掉"全部分类"
    // 从物品总览选择添加
    showItemOverviewDialog: false,
    itemOverviewList: [],
    itemOverviewFiltered: []
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    // 初始化categoryOptionsWithoutAll（去掉"全部分类"）
    const categoryOptionsWithoutAll = this.data.categoryOptions.slice(1);
    this.setData({
      categoryOptionsWithoutAll: categoryOptionsWithoutAll
    });

    const tripId = options.tripId;
    if (tripId) {
      this.setData({ tripId: tripId });
      this.fetchTripDetail(tripId);
      this.fetchItems(tripId);
      this.fetchItemOverview();
    }
  },

  // 获取行程详情
  async fetchTripDetail(tripId) {
    try {
      const response = await tripApi.getById(tripId);
      if (response.success) {
        this.setData({
          trip: response.data || {}
        });
      }
    } catch (error) {
      console.error('获取行程详情错误:', error);
    }
  },

  // 获取物品总览列表（用于添加物品对话框）
  async fetchItemOverview() {
    try {
      const response = await itemOverviewApi.getAll();
      if (response.success) {
        this.setData({
          itemOverviewList: response.data || []
        });
      }
    } catch (error) {
      console.error('获取物品总览错误:', error);
    }
  },

  // 获取物品列表（从item_overview获取所有物品，根据items表判断勾选状态）
  async fetchItems(tripId, filterParams = {}) {
    this.setData({ loading: true });

    try {
      // 1. 获取物品总览数据（支持筛选）
      let itemOverviewResponse;
      if (filterParams.categoryCode || filterParams.keyword) {
        // 使用筛选API
        itemOverviewResponse = await itemOverviewApi.getFilteredItems(filterParams);
      } else {
        // 获取所有物品总览
        itemOverviewResponse = await itemOverviewApi.getAll();
      }

      if (!itemOverviewResponse.success) {
        wx.showToast({
          title: itemOverviewResponse.message || '获取物品总览失败',
          icon: 'none'
        });
        return;
      }

      // 2. 获取该旅程的物品列表（已勾选的物品）
      const tripItemsResponse = await itemApi.getByTripId(tripId);
      if (!tripItemsResponse.success) {
        wx.showToast({
          title: tripItemsResponse.message || '获取旅程物品失败',
          icon: 'none'
        });
        return;
      }

      const tripItems = tripItemsResponse.data || [];

      // 3. 更新统计数据
      const totalCount = itemOverviewResponse.data.length;
      const checkedCount = tripItems.length;
      const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

      // 4. 构建物品列表：从item_overview获取所有物品，根据items表判断勾选状态
      const items = (itemOverviewResponse.data || []).map(itemOverview => {
        // 检查该物品是否在该旅程的物品列表中（已勾选）
        const tripItem = tripItems.find(ti => ti.itemOverviewId === itemOverview.id);
        const isChecked = !!tripItem;

        // 如果是已勾选的物品，从tripItems中获取详细信息
        let note = '';
        let priority = 'medium';
        let itemId = null;
        if (tripItem) {
          note = tripItem.note || '';
          priority = tripItem.priority || 'medium';
          itemId = tripItem.id; // 保存items表中的ID
        }

        // 获取分类文本
        const category = this.getCategoryByCategoryId(itemOverview.categoryId || itemOverview.category);
        const categoryText = this.getCategoryText(category);

        return {
          id: itemId || itemOverview.id, // 优先使用items表中的ID
          itemOverviewId: itemOverview.id,
          name: itemOverview.name,
          category: category,
          categoryText: categoryText,
          description: itemOverview.description || '',
          imageUrl: itemOverview.imageUrl || '',
          tags: itemOverview.tags || [],
          note: note,
          priority: priority,
          checked: isChecked,
          isFromOverview: true
        };
      });

      this.setData({
        items: items,
        filteredItems: items,
        checkedCount: checkedCount,
        totalCount: totalCount,
        progressPercentage: progressPercentage
      });
    } catch (error) {
      console.error('获取物品列表错误:', error);
      wx.showToast({
        title: '获取物品列表失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 分类筛选
  onCategoryChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.categoryOptions[index];
    const category = selectedOption ? selectedOption.value : '';
    
    this.setData({
      'filterForm.category': category,
      selectedCategoryLabel: selectedOption ? selectedOption.label : '全部分类',
      categoryIndex: index
    });
    
    // 应用筛选
    this.applyFilter();
  },

  // 关键词搜索
  onKeywordInput(e) {
    const keyword = e.detail.value;
    this.setData({
      'filterForm.keyword': keyword
    });
    this.applyFilter();
  },

  // 应用筛选（调用后端API）
  async applyFilter() {
    const { filterForm, tripId } = this.data;
    
    // 构建筛选参数
    const filterParams = {};
    if (filterForm.category) {
      filterParams.categoryCode = filterForm.category;
    }
    if (filterForm.keyword) {
      filterParams.keyword = filterForm.keyword;
    }
    
    // 调用后端API进行筛选
    await this.fetchItems(tripId, filterParams);
  },

  // 重置筛选
  async resetFilter() {
    this.setData({
      filterForm: {
        category: '',
        keyword: ''
      },
      selectedCategoryLabel: '全部分类',
      categoryIndex: 0
    });
    
    // 重新获取所有物品（不传筛选参数）
    await this.fetchItems(this.data.tripId);
  },

  // 更新物品查验状态
  async updateItemStatus(e) {
    const values = e.detail.value;
    const itemId = parseInt(e.detail.value[0]) || null;
    
    if (!itemId) return;
    
    const item = this.data.items.find(i => i.id === itemId || i.itemOverviewId === itemId);
    if (!item) return;

    const newChecked = values.length > 0;

    if (newChecked) {
      // 勾选：添加物品到items表
      try {
        const response = await itemApi.add({
          tripId: this.data.tripId,
          itemOverviewId: item.itemOverviewId,
          categoryId: this.getCategoryIdByCode(item.category),
          name: item.name,
          description: item.description || '',
          note: '',
          checked: false
        });

        if (response.success) {
          // 刷新数据
          await this.fetchItems(this.data.tripId);
          wx.showToast({
            title: `${item.name} 已添加`,
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: response.message || '添加失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('添加物品错误:', error);
        wx.showToast({
          title: '添加失败，请检查网络连接',
          icon: 'none'
        });
      }
    } else {
      // 取消勾选：删除items表中的数据
      try {
        // 如果有items表中的ID，使用deleteByItemOverviewId
        if (item.id && item.id !== item.itemOverviewId) {
          const response = await itemApi.delete(item.id);
          if (response.success) {
            // 刷新数据
            await this.fetchItems(this.data.tripId);
            wx.showToast({
              title: `${item.name} 已移除`,
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: response.message || '移除失败',
              icon: 'none'
            });
          }
        } else {
          // 使用itemOverviewId删除
          const response = await itemApi.deleteByItemOverviewId(this.data.tripId, item.itemOverviewId);
          if (response.success) {
            // 刷新数据
            await this.fetchItems(this.data.tripId);
            wx.showToast({
              title: `${item.name} 已移除`,
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: response.message || '移除失败',
              icon: 'none'
            });
          }
        }
      } catch (error) {
        console.error('删除物品错误:', error);
        wx.showToast({
          title: '移除失败，请检查网络连接',
          icon: 'none'
        });
      }
    }
  },

  // 删除物品
  async deleteItem(e) {
    const itemId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个物品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await itemApi.delete(itemId);
            if (response.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.fetchItems(this.data.tripId);
            } else {
              wx.showToast({
                title: response.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('删除物品错误:', error);
            wx.showToast({
              title: '删除失败，请检查网络连接',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 显示添加物品对话框
  showAddItem() {
    this.setData({
      showAddItemDialog: true,
      addItemForm: {
        name: '',
        category: '',
        description: '',
        note: '',
        categoryIndex: 0
      },
      selectedCategoryLabelForAdd: '请选择分类'
    });
  },

  // 显示从物品总览添加对话框
  showAddFromOverview() {
    // 过滤掉已经添加过的物品（通过itemOverviewId判断）
    const { items } = this.data;
    const addedItemOverviewIds = new Set(
      items.filter(item => item.checked).map(item => item.itemOverviewId)
    );
    
    const filtered = this.data.itemOverviewList.filter(item => {
      return !addedItemOverviewIds.has(item.id);
    });
    
    this.setData({
      showItemOverviewDialog: true,
      itemOverviewFiltered: filtered
    });
  },

  // 从物品总览选择添加
  async selectFromOverview(e) {
    const itemOverviewId = e.currentTarget.dataset.id;
    const itemOverview = this.data.itemOverviewList.find(i => i.id === itemOverviewId);
    
    if (!itemOverview) return;

    try {
      const response = await itemApi.add({
        tripId: this.data.tripId,
        itemOverviewId: itemOverviewId,
        categoryId: itemOverview.categoryId || this.getCategoryIdByCode(itemOverview.category),
        name: itemOverview.name,
        description: itemOverview.description || '',
        note: '',
        checked: false
      });

      if (response.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        this.setData({ showItemOverviewDialog: false });
        await this.fetchItems(this.data.tripId);
        await this.fetchItemOverview();
      } else {
        wx.showToast({
          title: response.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('添加物品错误:', error);
      wx.showToast({
        title: '添加失败，请检查网络连接',
        icon: 'none'
      });
    }
  },

  // 输入物品名称
  onItemNameInput(e) {
    this.setData({
      'addItemForm.name': e.detail.value
    });
  },

  // 选择分类
  onItemCategoryChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.categoryOptionsWithoutAll[index];
    this.setData({
      'addItemForm.category': selectedOption ? selectedOption.value : '',
      'addItemForm.categoryIndex': index,
      selectedCategoryLabelForAdd: selectedOption ? selectedOption.label : '请选择分类'
    });
  },

  // 输入描述
  onItemDescriptionInput(e) {
    this.setData({
      'addItemForm.description': e.detail.value
    });
  },

  // 输入备注
  onItemNoteInput(e) {
    this.setData({
      'addItemForm.note': e.detail.value
    });
  },

  // 确认添加物品
  async confirmAddItem() {
    const { name, category } = this.data.addItemForm;

    if (!name || name.trim() === '') {
      wx.showToast({
        title: '请输入物品名称',
        icon: 'none'
      });
      return;
    }

    if (!category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return;
    }

    try {
      // 先添加到物品总览
      const overviewResponse = await itemOverviewApi.addToItemOverview({
        name: name,
        category: category,
        categoryId: this.getCategoryIdByCode(category),
        description: this.data.addItemForm.description || ''
      });

      if (overviewResponse.success) {
        const itemOverviewId = overviewResponse.data.id;
        
        // 再添加到行程物品列表
        const response = await itemApi.add({
          tripId: this.data.tripId,
          itemOverviewId: itemOverviewId,
          categoryId: this.getCategoryIdByCode(category),
          name: name,
          description: this.data.addItemForm.description || '',
          note: this.data.addItemForm.note || '',
          checked: false
        });

        if (response.success) {
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
          this.setData({ showAddItemDialog: false });
          await this.fetchItems(this.data.tripId);
          await this.fetchItemOverview();
        } else {
          wx.showToast({
            title: response.message || '添加失败',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: overviewResponse.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('添加物品错误:', error);
      wx.showToast({
        title: '添加失败，请检查网络连接',
        icon: 'none'
      });
    }
  },

  // 取消添加
  cancelAddItem() {
    this.setData({ 
      showAddItemDialog: false,
      addItemForm: {
        name: '',
        category: '',
        description: '',
        note: '',
        categoryIndex: 0
      },
      selectedCategoryLabelForAdd: '请选择分类'
    });
  },

  // 关闭物品总览对话框
  closeItemOverviewDialog() {
    this.setData({ showItemOverviewDialog: false });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 开始查验
  startCheck() {
    const { tripId } = this.data;
    wx.navigateTo({
      url: `/pages/check-process/check-process?tripId=${tripId}`
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 小程序中不需要特殊处理，catchtap已经阻止冒泡
  },

  // 获取分类ID（根据分类代码）
  getCategoryIdByCode(category) {
    const map = {
      'DOCUMENTS': 1,
      'CLOTHING': 2,
      'ELECTRONICS': 3,
      'TOILETRIES': 4,
      'MEDICINE': 5,
      'FOOD': 6,
      'OUTDOOR': 7,
      'OFFICE': 8,
      'SAFETY': 9,
      'OTHERS': 10
    };
    return map[category] || 10;
  },

  // 根据categoryId获取分类代码
  getCategoryByCategoryId(categoryId) {
    if (typeof categoryId === 'string') {
      return categoryId;
    }
    const map = {
      1: 'DOCUMENTS',
      2: 'CLOTHING',
      3: 'ELECTRONICS',
      4: 'TOILETRIES',
      5: 'MEDICINE',
      6: 'FOOD',
      7: 'OUTDOOR',
      8: 'OFFICE',
      9: 'SAFETY',
      10: 'OTHERS'
    };
    return map[categoryId] || 'OTHERS';
  },

  // 获取分类文本
  getCategoryText(category) {
    const map = {
      'DOCUMENTS': '证件类',
      'CLOTHING': '衣物类',
      'ELECTRONICS': '电子设备',
      'TOILETRIES': '洗漱用品',
      'MEDICINE': '药品类',
      'FOOD': '食品类',
      'OUTDOOR': '户外用品',
      'OFFICE': '办公用品',
      'SAFETY': '安全用品',
      'OTHERS': '其他用品'
    };
    // 兼容categoryId的情况
    if (typeof category === 'number') {
      const codeMap = {
        1: 'DOCUMENTS',
        2: 'CLOTHING',
        3: 'ELECTRONICS',
        4: 'TOILETRIES',
        5: 'MEDICINE',
        6: 'FOOD',
        7: 'OUTDOOR',
        8: 'OFFICE',
        9: 'SAFETY',
        10: 'OTHERS'
      };
      category = codeMap[category] || 'OTHERS';
    }
    return map[category] || category || '其他';
  }
});
