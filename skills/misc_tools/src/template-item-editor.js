const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

const CATEGORY_CODE_TO_ID = {
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

Page({
  data: {
    categoryOptions: [],
    form: {
      name: '',
      categoryIndex: -1,
      categoryCode: '',
      description: '',
      note: ''
    },
    selectedCategoryLabel: '请选择分类'
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
    this.eventChannel = eventChannel;
    if (eventChannel && eventChannel.on) {
      eventChannel.on('initTemplateItemForm', (payload = {}) => {
        this.setData({
          categoryOptions: payload.categoryOptions || []
        });
      });
    }
  },

  handleNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none' });
      this.setData({ 'form.name': '' });
      return;
    }
    this.setData({ 'form.name': value });
  },

  handleCategoryChange(e) {
    const index = Number(e.detail.value);
    const option = this.data.categoryOptions[index];
    this.setData({
      'form.categoryIndex': index,
      'form.categoryCode': option ? option.value : '',
      selectedCategoryLabel: option ? option.label : '请选择分类'
    });
  },

  handleDescriptionInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none' });
      this.setData({ 'form.description': '' });
      return;
    }
    this.setData({ 'form.description': value });
  },

  handleNoteInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      wx.showToast({ title: '有敏感词请重新输入', icon: 'none' });
      this.setData({ 'form.note': '' });
      return;
    }
    this.setData({ 'form.note': value });
  },

  handleCancel() {
    wx.navigateBack();
  },

  handleConfirm() {
    const { form } = this.data;
    const name = (form.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }
    if (containsSensitiveWord(name)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none' });
      return;
    }
    if (!form.categoryCode) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }

    const description = (form.description || '').trim();
    if (description && containsSensitiveWord(description)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none' });
      return;
    }
    const note = (form.note || '').trim();
    if (note && containsSensitiveWord(note)) {
      wx.showToast({ title: '请勿输入敏感内容', icon: 'none' });
      return;
    }

    const payload = {
      name,
      description,
      note,
      categoryCode: form.categoryCode,
      categoryId: CATEGORY_CODE_TO_ID[form.categoryCode] || CATEGORY_CODE_TO_ID.OTHERS,
      priority: 'medium'
    };

    if (this.eventChannel && this.eventChannel.emit) {
      this.eventChannel.emit('templateItemAdded', payload);
    }
    wx.navigateBack();
  }
});



