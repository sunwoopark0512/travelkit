const { cooperativeTripApi, cooperativeItemApi } = require('../../utils/api-cooperative.js');
const { itemOverviewApi } = require('../../utils/api.js');
const { isLoggedIn, getCurrentUserId } = require('../../utils/auth.js');
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

// 分类配置 (含颜色和图标)
const CATEGORY_CONFIG = {
  '证件类': { color: '#f97316', bg: '#ffedd5', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjk3MzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNNyA4aDEwTTcgMTJoMTAiLz48L3N2Zz4=" },
  '衣物类': { color: '#3b82f6', bg: '#dbeafe', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwLjM4IDMuNGEyIDIgMCAwIDAtMS44LTEuMTFINS40MmEyIDIgMCAwIDAtMS44IDEuMTFsLTEuMzMgMi42OGEyIDIgMCAwIDAgLjg3IDIuNThMNiAxMHYxMGEyIDIgMCAwIDAgMiAyaDhhMiAyIDAgMCAwIDItMlYxMGwyLjg1LTEuMzRhMiAyIDAgMCAwIC44Ny0yLjU4eiIvPjwvc3ZnPg==" },
  '电子设备': { color: '#8b5cf6', bg: '#ede9fe', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGI1Y2Y2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iNSIgeT0iMiIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIwIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTIgMThoLjAxIi8+PC9zdmc+" },
  '洗漱用品': { color: '#06b6d4', bg: '#cffafe', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDZiNmQ0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyYTcgNyAwIDAgMCA3LTdjMC0yLTEtMy45LTMtNS41cy0zLjUtNC00LTYuNWMtLjUgMi41LTIgNC45LTQgNi41QzYgMTEuMSA1IDEzIDUgMTVhNyA3IDAgMCAwIDcgN3oiLz48L3N2Zz4=" },
  '药品类': { color: '#ef4444', bg: '#fee2e2', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMiIgeT0iNiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTIgMTF2NCIvPjxwYXRoIGQ9Ik0xMCAxM2g0Ii8+PHBhdGggZD0iTTggNlY0YTIgMiAwIDAgMSAyLTJoMmEyIDIgMCAwIDEgMiAydjIiLz48L3N2Zz4=" },
  '食品类': { color: '#84cc16', bg: '#ecfccb', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjODRjYzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMnY3YzAgMS4xLjkgMiAyIDJoNGEyIDIgMCAwIDAgMi0yVjIiLz48cGF0aCBkPSJNNCAydjIwIi8+PHBhdGggZD0iTTIxIDE1VjJ2MGE1IDUgMCAwIDAtNSA1djZjMCAxLjEuOSAyIDIgMmgzIi8+PHBhdGggZD0iTTIxIDE1djciLz48L3N2Zz4=" },
  '户外用品': { color: '#15803d', bg: '#dcfce7', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTU4MDNkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIgMjFoMjAiLz48cGF0aCBkPSJNNSAyMWE1IDUgMCAwIDEgNiAwIDUgNSAwIDAgMSA2IDAiLz48cGF0aCBkPSJNMTEgMjFMMyA5bDktN2w5IDctOCA5Ii8+PC9zdmc+" },
  '办公用品': { color: '#4f46e5', bg: '#e0e7ff', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGY0NmU1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMiIgeT0iNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNMTYgMjFWNWEyIDIgMCAwIDAtMi0ySDZhMiAyIDAgMCAwLTIgMnYxNiIvPjwvc3ZnPg==" },
  '安全用品': { color: '#f59e0b', bg: '#fef3c7', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyczgtNC4yOCA4LTEwVjVsLTgtNGwtOCA0djdjMCA1LjcyIDggMTAgOCAxMHoiLz48L3N2Zz4=" },
  '其他用品': { color: '#64748b', bg: '#f1f5f9', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMSIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTIiIHI9IjEiLz48Y2lyY2xlIGN4PSI1IiBjeT0iMTIiIHI9IjEiLz48L3N2Zz4=" },
  '默认': { color: '#94a3b8', bg: '#f8fafc', icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=" }
};

Page({
  data: {
    statusBarHeight: 44,
    tripId: null,
    trip: {},
    loading: false,
    items: [],
    libraryItems: [],
    filteredItems: [],
    filterForm: {
      category: '',
      keyword: ''
    },
    categoryOptions: CATEGORY_OPTIONS,
    categoryOptionsWithoutAll: CATEGORY_OPTIONS.slice(1),
    categoryIndex: 0,
    selectedCategoryLabel: '全部分类',
    selectedCategoryLabelForAdd: '请选择分类',
    checkedCount: 0,
    totalCount: 0,
    progressPercentage: 0,
    isUpdatingStatus: false,
    showAddItemDialog: false,
    addItemForm: {
      name: '',
      category: '',
      categoryIndex: -1,
      description: ''
    },
    addLoading: false,
    currentUserId: null,
    canModifyItems: true,
    categoryList: [],
    
    // 图标 (UI Icons)
    iconSearch: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTEiIGN5PSIxMSIgcj0iOCIvPjxsaW5lIHgxPSIyMSIgeTE9IjIxIiB4Mj0iMTYuNjUiIHkyPSIxNi42NSIvPjwvc3ZnPg==",
    iconCheckMini: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiLz48L3N2Zz4=",
    iconNoteMini: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjViZjI0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE1LjUgM0g1YTIgMiAwIDAgMC0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGEyIDIgMCAwIDAgMi0yVjguNUwxNS41IDN6Ii8+PHBhdGggZD0iTTE1IDN2NmgyIi8+PC9zdmc+",
    iconPackage: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMTYuNSA5LjQtLTktNS4xOW05IDUuMTlNOSA4LjUybTcuNSA5LjYzaC05bTkgLTl2OS4yNG0tOSAtOS4yNHY5LjI0Ii8+PHBhdGggZD0iTTIyIDEyLjU0di01LjIyYzAtLjY4LS4zNi0xLjMtLjk2LTEuNjRMMTMuMDQuODZjLS42My0uMzYtMS40NS0uMzYtMi4wOCAwTDMuMDIgNS42OGMtLjU5LjM0LS45Ni45Ni0uOTYgMS42NHY1LjIyYzAgLjY4LjM2IDEuMy45NiAxLjY0bDcuOTQgNC44MmMuNjMuMzYgMS40NS4zNiAyLjA4IDBsNy45NC00LjgyYy42LS4zNC45Ni0uOTYuOTYtMS42NHoiLz48L3N2Zz4=",
    iconDelete: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjU2NTY1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgNmgxOCIvPjxwYXRoIGQ9Ik0xOSA2djE0YTIgMiAwIDAgMS0yIDJIN2EyIDIgMCAwIDEtMi0yVjYiLz48cGF0aCBkPSJNOCA2VjRhMiAyIDAgMCAxIDItMmg0YTIgMiAwIDAgMSAyIDJ2MiIvPjxsaW5lIHgxPSIxMCIgeTE9IjExIiB4Mj0iMTAiIHkyPSIxNyIvPjxsaW5lIHgxPSIxNCIgeTE9IjExIiB4Mj0iMTQiIHkyPSIxNyIvPjwvc3ZnPg==",
    iconClear: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4Ii8+PHBhdGggZD0iTTYgNiAxOCAxOCIvPjwvc3ZnPg==",
    iconSparkles: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTExIDE1LTMtMyAzLTMiLz48cGF0aCBkPSJtMTMgOSAzIDMtMyAzIi8+PC9zdmc+",
    iconX: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4Ii8+PHBhdGggZD0iTTYgNiAxOCAxOCIvPjwvc3ZnPg==",
    iconBasket: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTMgNiAxLjc1IDEwLjVhMiAyIDAgMCAwIDIgMS41aDEwLjVhMiAyIDAgMCAwIDItMS41bDEuNzUtMTAuNSIvPjxwYXRoIGQ9Ik0zIDZoMTgiLz48cGF0aCBkPSJtMTYgNi00LTQtNCA0Ii8+PC9zdmc+",
    iconAlignLeft: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjIxIiB4Mj0iMyIgeTE9IjYiIHkyPSI2Ii8+PGxpbmUgeDE9IjE1IiB4Mj0iMyIgeTE9IjEyIiB5Mj0iMTIiLz48bGluZSB4MT0iMTciIHgyPSIzIiB5MT0iMTgiIHkyPSIxOCIvPjwvc3ZnPg==",
    iconEraser: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTI5LjE3OSAxNi42NjItOC04YzAgMCA4LjU4NiA4LjU4NiA4LjU4NiAxMi44MThhNiA2IDAgMCAxLTguNDg2IDguNDg2TC41IDEzLjQ4MiA3LjcyMyA1LjM4OGE2IDYgMCAwIDEgOC40ODYgMGw4Ljk3IDguOTc0Ii8+PHBhdGggZD0iTTE4IDEwIDUgMjMiLz48L3N2Zz4=",
    iconCheck: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiLz48L3N2Zz4=",
    iconPlus: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjEyIiB5MT0iNSIgeDI9IjEyIiB5Mj0iMTkiPjwvbGluZT48bGluZSB4MT0iNSIgeTE9IjEyIiB4Mj0iMTkiIHkyPSIxMiI+PC9saW5lPjwvc3ZnPg=="
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    
    const sys = wx.getSystemInfoSync();
    
    // 初始化弹窗分类列表
    const categoryList = Object.keys(CATEGORY_CONFIG).filter(key => key !== '默认').map(key => ({
      name: key,
      ...CATEGORY_CONFIG[key]
    }));
    
    const currentUserId = getCurrentUserId();
    this.setData({ 
      statusBarHeight: sys.statusBarHeight,
      currentUserId: currentUserId || null,
      categoryList
    });
    
    const tripId = options?.tripId;
    if (tripId) {
      this.setData({ tripId });
      this.refreshData();
    }
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => wx.stopPullDownRefresh());
  },

  async refreshData() {
    const { tripId } = this.data;
    if (!tripId) return;
    this.setData({ loading: true });
    await Promise.all([
      this.fetchTripDetail(tripId),
      this.fetchItems(tripId),
      this.loadLibraryItems()
    ]);
    this.setData({ loading: false });
    this.mergeLibraryItems();
  },

  async fetchTripDetail(tripId) {
    try {
      const userId = this.data.currentUserId;
      const resp = await cooperativeTripApi.getById(tripId, userId);
      if (resp.success) {
        const trip = resp.trip || resp.data || {};
        const canModifyItems = !this.shouldLockForUser(trip);
        const dataUpdate = {
          trip,
          canModifyItems
        };
        if (!canModifyItems && this.data.showAddItemDialog) {
          dataUpdate.showAddItemDialog = false;
        }
        this.setData(dataUpdate);
      }
    } catch (error) {
      console.error('获取合作行程详情失败:', error);
    }
  },

  async fetchItems(tripId, filterParams = {}) {
    this.setData({ loading: true });

    try {
      const userId = getCurrentUserId();
      if (!userId) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        wx.showToast({
          title: '用户ID格式错误',
          icon: 'none'
        });
        return;
      }

      // 1. 获取物品总览（item_overview）
      let itemOverviewResponse;
      if (filterParams.categoryCode || filterParams.keyword) {
        itemOverviewResponse = await itemOverviewApi.getFilteredItems(filterParams);
      } else {
        itemOverviewResponse = await itemOverviewApi.getAll();
      }

      if (!itemOverviewResponse.success) {
        wx.showToast({
          title: itemOverviewResponse.message || '获取物品总览失败',
          icon: 'none'
        });
        return;
      }

      // 2. 获取该合作行程的已勾选物品（cooperative_items）
      const cooperativeItemsResponse = await cooperativeItemApi.listByTrip(tripId, userIdNum);
      if (!cooperativeItemsResponse.success) {
        wx.showToast({
          title: cooperativeItemsResponse.message || '获取已勾选物品失败',
          icon: 'none'
        });
        return;
      }
      const cooperativeItems = cooperativeItemsResponse.data || [];

      // 3. 合成 items：以 item_overview 为底，cooperative_items 决定是否 checked
      const allItems = (itemOverviewResponse.data || []).map(itemOverview => {
        const cooperativeItem = cooperativeItems.find(ci => ci.itemOverviewId === itemOverview.id);
        const isChecked = !!cooperativeItem;

        let description = '';
        let priority = 'medium';
        let itemId = null;
        let addedByName = '';
        if (cooperativeItem) {
          description = cooperativeItem.description || itemOverview.description || '';
          priority = cooperativeItem.priority || 'medium';
          itemId = cooperativeItem.id;
          addedByName = cooperativeItem.addedByName || '';
        } else {
          description = itemOverview.description || '';
        }

        const category = this.getCategoryByCategoryId(itemOverview.categoryId || itemOverview.category);
        const categoryText = this.getCategoryText(category);

        const config = this.getCategoryConfig(categoryText);
        return {
          id: itemId || itemOverview.id,
          itemOverviewId: itemOverview.id,
          name: itemOverview.name,
          category: category,
          categoryCode: this.getCategoryCodeById(itemOverview.categoryId) || category,
          categoryText: categoryText,
          description: description,
          imageUrl: itemOverview.imageUrl || '',
          tags: itemOverview.tags || [],
          priority: priority,
          checked: isChecked,
          addedByName: addedByName,
          isFromOverview: true,
          config: config
        };
      });

      const totalCount = allItems.length;
      const checkedCount = allItems.filter(item => item.checked).length;
      const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

      this.setData({
        items: allItems,
        checkedCount,
        totalCount,
        progressPercentage
      });

      this.mergeLibraryItems();
    } catch (error) {
      console.error('获取合作行程物品失败:', error);
      wx.showToast({
        title: '获取物品列表失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  normalizeItem(item) {
    let categoryCode = 'OTHERS';
    if (item.categoryId) {
      categoryCode = this.getCategoryCodeById(item.categoryId);
    } else if (item.categoryCode) {
      categoryCode = item.categoryCode.toUpperCase();
    } else if (item.category) {
      categoryCode = item.category.toUpperCase();
    }
    return {
      ...item,
      id: item.id,
      categoryCode,
      categoryText: this.getCategoryText(categoryCode),
      isTemplateItem: item.isTemplateItem === true || item.isTemplateItem === 1
    };
  },

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
    return map[category] || '其他用品';
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value) || 0;
    const option = this.data.categoryOptions[index];
    const category = option ? option.value : '';

    this.setData({
      categoryIndex: index,
      selectedCategoryLabel: option ? option.label : '全部分类',
      'filterForm.category': category
    });

    this.mergeLibraryItems();
  },

  // 新的分类选择方法（pill点击）
  onCategorySelect(e) {
    const label = e.currentTarget.dataset.label;
    const option = this.data.categoryOptions.find(opt => opt.label === label);
    if (!option) return;
    
    const category = option.value;
    const index = this.data.categoryOptions.findIndex(opt => opt.label === label);
    
    this.setData({
      categoryIndex: index >= 0 ? index : 0,
      selectedCategoryLabel: label,
      'filterForm.category': category
    });

    this.mergeLibraryItems();
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      'filterForm.keyword': ''
    });
    this.mergeLibraryItems();
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || '';
    this.setData({
      'filterForm.keyword': keyword
    });
    this.mergeLibraryItems();
  },

  applyFilter(list) {
    const { category, keyword } = this.data.filterForm;
    const text = (keyword || '').trim().toLowerCase();
    return list.filter(item => {
      const matchCategory = !category || item.categoryCode === category;
      const matchKeyword =
        !text ||
        (item.name || '').toLowerCase().includes(text) ||
        (item.categoryText || '').toLowerCase().includes(text);
      return matchCategory && matchKeyword;
    }).map(item => {
      if (!item.categoryText) {
        item.categoryText = this.getCategoryText(item.categoryCode);
      }
      return item;
    });
  },

  getCurrentFilterParams() {
    const { filterForm } = this.data;
    const filterParams = {};
    if (filterForm.category) {
      filterParams.categoryCode = filterForm.category;
    }
    if (filterForm.keyword) {
      filterParams.keyword = filterForm.keyword;
    }
    return filterParams;
  },

  resetFilter() {
    this.setData({
      filterForm: {
        category: '',
        keyword: ''
      },
      selectedCategoryLabel: '全部分类',
      categoryIndex: 0
    });
    this.mergeLibraryItems();
  },

  async resetAllCheckedItems() {
    if (!this.ensureCanModifyItems()) return;
    const { tripId, checkedCount } = this.data;
    if (checkedCount === 0) {
      wx.showToast({
        title: '没有已勾选的物品',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认重置',
      content: `确定要清空所有已勾选的物品吗？共 ${checkedCount} 个物品将被取消勾选。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ loading: true });
            const checkedItems = this.data.items.filter(item => item.checked && item.id && item.id !== item.itemOverviewId);
            for (const item of checkedItems) {
              await cooperativeItemApi.delete(item.id);
            }
            wx.showToast({
              title: '重置成功',
              icon: 'success'
            });
            await this.fetchItems(tripId, this.getCurrentFilterParams());
          } catch (error) {
            console.error('重置所有勾选状态错误:', error);
            wx.showToast({
              title: '重置失败，请检查网络连接',
              icon: 'none'
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      }
    });
  },

  // 新的切换物品勾选方法（卡片点击）
  async toggleItemCheck(e) {
    if (!this.ensureCanModifyItems()) return;
    if (this.data.isUpdatingStatus) return;
    
    const id = e.currentTarget.dataset.id;
    const item = this.data.filteredItems.find(i => (i.id || i.itemOverviewId) === id);
    if (!item) return;
    
    this.setData({ isUpdatingStatus: true });
    
    try {
      if (item.checked) {
        await this.uncheckItem(item);
      } else {
        await this.checkItem(item);
      }
      await this.fetchItems(this.data.tripId, this.getCurrentFilterParams());
    } catch (error) {
      console.error('切换物品状态错误:', error);
      wx.showToast({
        title: '操作失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ isUpdatingStatus: false });
    }
  },

  async updateItemStatus(e) {
    if (!this.ensureCanModifyItems()) return;
    if (this.data.isUpdatingStatus) return;

    const values = e.detail.value || [];
    const checkedItemOverviewIds = values.map(v => {
      const num = parseInt(v);
      return isNaN(num) ? v : num;
    });

    const visibleItems = this.data.filteredItems || this.data.items;
    const itemsToCheck = [];
    const itemsToUncheck = [];

    visibleItems.forEach(item => {
      let itemIdentifier = item.itemOverviewId;
      if (!itemIdentifier && item.id) {
        if (typeof item.id === 'string' && item.id.startsWith('library_')) {
          const match = item.id.match(/^library_(\d+)$/);
          if (match) {
            itemIdentifier = parseInt(match[1]);
          } else {
            itemIdentifier = item.id;
          }
        } else {
          itemIdentifier = item.id;
        }
      }

      const isChecked = checkedItemOverviewIds.some(id => {
        const idNum = typeof id === 'string' ? parseInt(id) : id;
        const identifierNum = typeof itemIdentifier === 'string' ? parseInt(itemIdentifier) : itemIdentifier;
        return id === itemIdentifier ||
               idNum === itemIdentifier ||
               id === itemIdentifier.toString() ||
               idNum === identifierNum;
      });

      if (item.checked && !isChecked) {
        itemsToUncheck.push(item);
      } else if (!item.checked && isChecked) {
        itemsToCheck.push(item);
      }
    });

    this.setData({ isUpdatingStatus: true });

    try {
      for (const item of itemsToCheck) {
        await this.checkItem(item);
      }
      for (const item of itemsToUncheck) {
        await this.uncheckItem(item);
      }
      if (itemsToCheck.length > 0 || itemsToUncheck.length > 0) {
        await this.fetchItems(this.data.tripId, this.getCurrentFilterParams());
      }
    } catch (error) {
      console.error('更新物品状态错误:', error);
      wx.showToast({
        title: '操作失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ isUpdatingStatus: false });
    }
  },

  async checkItem(item) {
    try {
      if (item.itemOverviewId && (!item.id || item.id === item.itemOverviewId)) {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error('请先登录');
        }

        const categoryId = item.categoryId || this.getCategoryIdByCode(item.category || item.categoryCode);
        const response = await cooperativeItemApi.add({
          tripId: this.data.tripId,
          itemOverviewId: item.itemOverviewId,
          categoryId: categoryId,
          name: item.name,
          description: item.description || '',
          addedBy: userId,
          priority: 'medium',
          checked: false
        });

        if (!response.success) {
          console.error('添加物品失败:', response.message);
          throw new Error(response.message || '添加物品失败');
        }
      } else {
        let actualItemId = item.id;
        if (typeof actualItemId === 'string' && actualItemId.startsWith('library_')) {
          actualItemId = item.itemOverviewId;
        } else if (actualItemId === item.itemOverviewId) {
          return;
        }
        actualItemId = parseInt(actualItemId);
        if (isNaN(actualItemId)) {
          throw new Error('无效的物品ID');
        }
        const payload = {
          checked: true,
          scope: 'self',
          userId: this.data.currentUserId
        };
        const response = await cooperativeItemApi.updateChecked(actualItemId, payload);
        if (!response.success) {
          console.error('更新物品状态失败:', response.message);
          throw new Error(response.message || '更新物品状态失败');
        }
      }
    } catch (error) {
      console.error('勾选物品错误:', error);
      throw error;
    }
  },

  async uncheckItem(item) {
    try {
      let itemId = item.id;
      if (typeof itemId === 'string' && itemId.startsWith('library_')) {
        return;
      }
      if (itemId && itemId !== item.itemOverviewId) {
        itemId = parseInt(itemId);
        if (isNaN(itemId)) {
          console.warn('无效的物品ID，跳过删除:', item.id);
          return;
        }
        const response = await cooperativeItemApi.delete(itemId);
        if (!response.success) {
          console.error('删除物品失败:', response.message);
          throw new Error(response.message || '删除物品失败');
        }
      }
    } catch (error) {
      console.error('取消勾选物品错误:', error);
      throw error;
    }
  },

  showAddItem() {
    if (!this.ensureCanModifyItems()) return;
    this.resetAddItemForm();
    this.setData({ showAddItemDialog: true });
  },

  cancelAddItem() {
    this.setData({ showAddItemDialog: false });
  },

  onItemNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'addItemForm.name': '' });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 'addItemForm.name': value });
  },

  onItemCategoryChange(e) {
    const index = Number(e.detail.value);
    const option = this.data.categoryOptionsWithoutAll[index];
    this.setData({
      'addItemForm.categoryIndex': index,
      'addItemForm.category': option ? option.value : '',
      selectedCategoryLabelForAdd: option ? option.label : '请选择分类'
    });
  },

  // 弹窗中的分类选择（卡片点击）
  selectCategory(e) {
    const name = e.currentTarget.dataset.name;
    const categoryCode = this.getCategoryCodeByName(name);
    this.setData({
      'addItemForm.category': categoryCode,
      selectedCategoryLabelForAdd: name
    });
  },

  onItemDescriptionInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'addItemForm.description': '' });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 'addItemForm.description': value });
  },

  async submitAddItem() {
    if (!this.ensureCanModifyItems()) {
      this.setData({ showAddItemDialog: false });
      return;
    }
    const { tripId, addItemForm } = this.data;
    if (!tripId) return;
    const name = (addItemForm.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }
    if (!addItemForm.category) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }

    if (containsSensitiveWord(name)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    const description = (addItemForm.description || '').trim();
    if (description && containsSensitiveWord(description)) {
      wx.showToast({
        title: '请勿输入敏感内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ addLoading: true });
    try {
      const categoryId = this.getCategoryIdByCode(addItemForm.category);
      const overviewRequestData = {
        name: name.trim(),
        categoryId: categoryId,
        description: (addItemForm.description || '').trim()
      };
      const overviewResponse = await itemOverviewApi.add(overviewRequestData);

      if (!overviewResponse.success) {
        wx.showToast({
          title: overviewResponse.message || '添加失败',
          icon: 'none'
        });
        return;
      }

      const itemOverviewId = overviewResponse.data.id;
      const payload = {
        tripId,
        itemOverviewId: itemOverviewId,
        name,
        categoryId: categoryId,
        description: (addItemForm.description || '').trim(),
        addedBy: userId,
        priority: 'medium',
        checked: false
      };
      const resp = await cooperativeItemApi.add(payload);
      if (resp.success) {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.setData({ showAddItemDialog: false });
        await this.fetchItems(tripId);
      } else {
        wx.showToast({ title: resp.message || '添加失败', icon: 'none' });
      }
    } catch (error) {
      console.error('添加合作物品失败:', error);
      wx.showToast({ title: '添加失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ addLoading: false });
    }
  },

  resetAddItemForm() {
    this.setData({
      addItemForm: {
        name: '',
        category: '',
        categoryIndex: -1,
        description: ''
      },
      selectedCategoryLabelForAdd: '请选择分类'
    });
  },

  async loadLibraryItems() {
    try {
      const resp = await itemOverviewApi.getAll();
      if (resp && resp.success) {
        const libraryItems = (resp.data || []).map(item => {
          const categoryCode = (item.category || item.categoryCode || 'OTHERS').toUpperCase();
          const categoryText = this.getCategoryText(categoryCode);
          const config = this.getCategoryConfig(categoryText);
          return {
            ...item,
            id: `library_${item.id}`,
            itemOverviewId: item.id,
            isLibraryItem: true,
            categoryCode: categoryCode,
            categoryText: categoryText,
            checked: false,
            config: config
          };
        });
        this.setData({ libraryItems });
      }
    } catch (error) {
      console.error('加载物品库失败:', error);
    }
  },

  mergeLibraryItems() {
    const { items, libraryItems } = this.data;
    const mergedItems = [...items];

    libraryItems.forEach(libItem => {
      const existsInTrip = items.some(item =>
        item.itemOverviewId === libItem.itemOverviewId
      );
      if (!existsInTrip) {
        mergedItems.push(libItem);
      }
    });

    // 为每个item添加config
    const itemsWithConfig = mergedItems.map(item => {
      const categoryText = item.categoryText || this.getCategoryText(item.categoryCode || item.category);
      const config = this.getCategoryConfig(categoryText);
      return {
        ...item,
        config: config
      };
    });

    const filtered = this.applyFilter(itemsWithConfig);
    const totalCount = items.length;
    const checkedCount = items.filter(i => i.checked).length;
    const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

    this.setData({
      filteredItems: filtered,
      checkedCount,
      totalCount,
      progressPercentage
    });
  },

  // 获取分类配置
  getCategoryConfig(categoryText) {
    return CATEGORY_CONFIG[categoryText] || CATEGORY_CONFIG['默认'];
  },

  // 根据分类名称获取分类代码
  getCategoryCodeByName(name) {
    const map = {
      '证件类': 'DOCUMENTS',
      '衣物类': 'CLOTHING',
      '电子设备': 'ELECTRONICS',
      '洗漱用品': 'TOILETRIES',
      '药品类': 'MEDICINE',
      '食品类': 'FOOD',
      '户外用品': 'OUTDOOR',
      '办公用品': 'OFFICE',
      '安全用品': 'SAFETY',
      '其他用品': 'OTHERS'
    };
    return map[name] || 'OTHERS';
  },

  ensureCanModifyItems() {
    if (this.data.canModifyItems) {
      return true;
    }
    wx.showToast({
      title: '你已完成此清单，无法继续修改',
      icon: 'none'
    });
    return false;
  },

  shouldLockForUser(trip) {
    if (!trip) return false;
    const status = (trip.status || '').toLowerCase();
    const progress = Number(trip.progress || 0);
    const tripId = trip.id || this.data.tripId;
    const userId = this.data.currentUserId;
    if (progress >= 100) return true;
    if (this.hasCompletionLock(tripId, userId)) return true;
    if (status === 'cancelled') return true;
    return false;
  },

  hasCompletionLock(tripId, userId) {
    if (!tripId || !userId) {
      return false;
    }
    try {
      const locks = wx.getStorageSync('coopChecklistLocks') || {};
      const key = `${tripId}_${userId}`;
      return !!locks[key];
    } catch (error) {
      console.warn('读取合作清单锁状态失败:', error);
      return false;
    }
  },

  stopPropagation() {
    // 用于阻止冒泡
  },

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

  getCategoryCodeById(categoryId) {
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

  getCategoryByCategoryId(categoryId) {
    if (typeof categoryId === 'string') {
      return categoryId;
    }
    return this.getCategoryCodeById(categoryId);
  },

  goBack() {
    wx.navigateBack();
  }
});


