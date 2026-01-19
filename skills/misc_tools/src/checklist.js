// pages/checklist/checklist.js
const { itemApi, tripApi, itemOverviewApi } = require('../../utils/api.js');
const { isLoggedIn, getCurrentUserId } = require('../../utils/auth.js');
const { containsSensitiveWord } = require('../../utils/sensitive-word-filter.js');

// 1. 分类配置 (含颜色和图标)
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

// 分类名称到分类代码的映射
const CATEGORY_NAME_TO_CODE = {
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

Page({
  data: {
    statusBarHeight: 44,
    tripId: null,
    trip: {},
    items: [],
    filteredItems: [],
    totalCount: 0,
    checkedCount: 0,
    progressPercentage: 0,
    loading: false,
    isUpdatingStatus: false,
    canModifyItems: true,
    
    // 筛选相关
    filterForm: { keyword: '' },
    categoryOptions: ['全部', '证件类', '衣物类', '电子设备', '洗漱用品', '药品类', '食品类', '户外用品', '办公用品', '安全用品', '其他用品'],
    selectedCategoryLabel: '全部',

    // 弹窗相关
    isAddModalOpen: false,
    categoryList: [],
    newItem: { name: '', category: '证件类', desc: '', note: '' },

    // 图标 (UI Icons)
    iconSearch: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTEiIGN5PSIxMSIgcj0iOCIvPjxsaW5lIHgxPSIyMSIgeTE9IjIxIiB4Mj0iMTYuNjUiIHkyPSIxNi42NSIvPjwvc3ZnPg==",
    iconCheckMini: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiLz48L3N2Zz4=",
    iconNoteMini: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjViZjI0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE1LjUgM0g1YTIgMiAwIDAgMC0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGEyIDIgMCAwIDAgMi0yVjguNUwxNS41IDN6Ii8+PHBhdGggZD0iTTE1IDN2NmgyIi8+PC9zdmc+",
    iconPackage: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMTYuNSA5LjQtLTktNS4xOW05IDUuMTlNOSA4LjUybTcuNSA5LjYzaC05bTkgLTl2OS4yNG0tOSAtOS4yNHY5LjI0Ii8+PHBhdGggZD0iTTIyIDEyLjU0di01LjIyYzAtLjY4LS4zNi0xLjMtLjk2LTEuNjRMMTMuMDQuODZjLS42My0uMzYtMS40NS0uMzYtMi4wOCAwTDMuMDIgNS42OGMtLjU5LjM0LS45Ni45Ni0uOTYgMS42NHY1LjIyYzAgLjY4LjM2IDEuMy45NiAxLjY0bDcuOTQgNC44MmMuNjMuMzYgMS40NS4zNiAyLjA4IDBsNy45NC00LjgyYy42LS4zNC45Ni0uOTYuOTYtMS42NHoiLz48L3N2Zz4=",
    
    // 弹窗相关图标
    iconSparkles: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTExIDE1LTMtMyAzLTMiLz48cGF0aCBkPSJtMTMgOSAzIDMtMyAzIi8+PC9zdmc+",
    iconX: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4Ii8+PHBhdGggZD0iTTYgNiAxOCAxOCIvPjwvc3ZnPg==",
    iconClear: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggNiA2IDE4Ii8+PHBhdGggZD0iTTYgNiAxOCAxOCIvPjwvc3ZnPg==",
    iconBasket: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTMgNiAxLjc1IDEwLjVhMiAyIDAgMCAwIDIgMS41aDEwLjVhMiAyIDAgMCAwIDItMS41bDEuNzUtMTAuNSIvPjxwYXRoIGQ9Ik0zIDZoMTgiLz48cGF0aCBkPSJtMTYgNi00LTQtNCA0Ii8+PC9zdmc+",
    iconAlignLeft: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjIxIiB4Mj0iMyIgeTE9IjYiIHkyPSI2Ii8+PGxpbmUgeDE9IjE1IiB4Mj0iMyIgeTE9IjEyIiB5Mj0iMTIiLz48bGluZSB4MT0iMTciIHgyPSIzIiB5MT0iMTgiIHkyPSIxOCIvPjwvc3ZnPg==",
    iconStickyNote: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTZhYzAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE1LjUgM0g1YTIgMiAwIDAgMC0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGEyIDIgMCAwIDAtMiAydjE2NUwxNS41IDN6Ii8+PHBhdGggZD0iTTE1IDN2NmgyIi8+PC9zdmc+",
    iconEraser: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTI5LjE3OSAxNi42NjItOC04YzAgMCA4LjU4NiA4LjU4NiA4LjU4NiAxMi44MThhNiA2IDAgMCAxLTguNDg2IDguNDg2TC41IDEzLjQ4MiA3LjcyMyA1LjM4OGE2IDYgMCAwIDEgOC40ODYgMGw4Ljk3IDguOTc0Ii8+PHBhdGggZD0iTTE4IDEwIDUgMjMiLz48L3N2Zz4=",
    iconCheck: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiLz48L3N2Zz4=",
    iconPlus: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjEyIiB5MT0iNSIgeDI9IjEyIiB5Mj0iMTkiPjwvbGluZT48bGluZSB4MT0iNSIgeTE9IjEyIiB4Mj0iMTkiIHkyPSIxMiI+PC9saW5lPjwvc3ZnPg=="
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const sys = wx.getSystemInfoSync();
    
    // 初始化弹窗分类列表
    const categoryList = Object.keys(CATEGORY_CONFIG).filter(key => key !== '默认').map(key => ({
      name: key,
      ...CATEGORY_CONFIG[key]
    }));

    this.setData({ 
      statusBarHeight: sys.statusBarHeight,
      categoryList
    });
    
    const tripId = options.tripId;
    if (tripId) {
      this.setData({ tripId: tripId });
      this.fetchTripDetail(tripId);
      this.fetchItems(tripId);
    }
  },

  // 获取行程详情
  async fetchTripDetail(tripId) {
    try {
      const response = await tripApi.getById(tripId);
      if (response.success) {
        const trip = response.data || {};
        const canModifyItems = !this.isTripLocked(trip.status);
        const updateData = {
          trip,
          canModifyItems
        };
        if (!canModifyItems && this.data.isAddModalOpen) {
          updateData.isAddModalOpen = false;
        }
        this.setData(updateData);
      }
    } catch (error) {
      console.error('获取行程详情错误:', error);
    }
  },

  // 获取物品列表（从item_overview获取所有公共物品，从items表获取已添加的物品和用户自定义物品）
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

      // 确保 userId 是数字类型
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        wx.showToast({
          title: '用户ID格式错误',
          icon: 'none'
        });
        return;
      }

      // 1. 获取物品总览数据（支持筛选）
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

      // 2. 获取该旅程的物品列表
      const tripItemsResponse = await itemApi.getByTripId(tripId);
      if (!tripItemsResponse.success) {
        wx.showToast({
          title: tripItemsResponse.message || '获取旅程物品失败',
          icon: 'none'
        });
        return;
      }

      const tripItems = tripItemsResponse.data || [];

      // 3. 构建物品列表：从item_overview获取所有物品，根据items表判断勾选状态
      const publicItems = (itemOverviewResponse.data || []).map(itemOverview => {
        const tripItem = tripItems.find(ti => ti.itemOverviewId === itemOverview.id);
        const isChecked = !!tripItem;

        let note = '';
        let priority = 'medium';
        let itemId = null;
        if (tripItem) {
          note = tripItem.note || '';
          priority = tripItem.priority || 'medium';
          itemId = tripItem.id;
        }

        // 获取分类文本
        const category = this.getCategoryByCategoryId(itemOverview.categoryId || itemOverview.category);
        const categoryText = this.getCategoryText(category);

        // 处理tags字段
        let tags = [];
        if (itemOverview.tags) {
          if (Array.isArray(itemOverview.tags)) {
            tags = itemOverview.tags;
          } else if (typeof itemOverview.tags === 'string') {
            try {
              const parsed = JSON.parse(itemOverview.tags);
              if (Array.isArray(parsed)) {
                tags = parsed;
              } else {
                tags = itemOverview.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
              }
            } catch (e) {
              tags = itemOverview.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag.length > 0);
            }
          }
        }

        return {
          id: itemId || itemOverview.id,
          itemOverviewId: itemOverview.id,
          name: itemOverview.name,
          category: categoryText,
          categoryText: categoryText,
          description: itemOverview.description || '',
          imageUrl: itemOverview.imageUrl || '',
          tags: tags,
          note: note,
          priority: priority,
          checked: isChecked,
          isFromOverview: true
        };
      });

      const allItems = publicItems;
      this.processData(allItems);
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

  // 处理数据：合并配置、计算进度
  processData(items) {
    // 为每个item附加配置信息 (颜色图标)
    const processedItems = items.map(item => {
      const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['默认'];
      return { ...item, config };
    });

    const totalCount = processedItems.length;
    const checkedCount = processedItems.filter(i => i.checked).length;
    const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

    this.setData({
      items: processedItems,
      totalCount,
      checkedCount,
      progressPercentage
    });
    this.filterItems(); // 重新筛选
  },

  // 筛选逻辑
  onKeywordInput(e) {
    this.setData({ 'filterForm.keyword': e.detail.value });
    this.filterItems();
  },

  clearSearch() {
    this.setData({ 'filterForm.keyword': '' });
    this.filterItems();
  },

  onCategorySelect(e) {
    const label = e.currentTarget.dataset.label;
    this.setData({ selectedCategoryLabel: label });
    this.filterItems();
  },

  filterItems() {
    let { items, selectedCategoryLabel, filterForm } = this.data;
    let filtered = items.filter(item => {
      const matchCat = selectedCategoryLabel === '全部' || item.category === selectedCategoryLabel;
      const matchKey = !filterForm.keyword || item.name.toLowerCase().includes(filterForm.keyword.toLowerCase());
      return matchCat && matchKey;
    });
    this.setData({ filteredItems: filtered });
  },

  resetFilter() {
    this.setData({
      selectedCategoryLabel: '全部',
      'filterForm.keyword': ''
    });
    this.filterItems();
  },

  resetAllCheckedItems() {
    if (!this.ensureCanModifyItems()) {
      return;
    }
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
            const response = await itemApi.resetAllCheckedItems(tripId);
            
            if (response.success) {
              wx.showToast({
                title: '重置成功',
                icon: 'success'
              });
              await this.fetchItems(tripId);
            } else {
              wx.showToast({
                title: response.message || '重置失败',
                icon: 'none'
              });
            }
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

  // 切换物品勾选状态
  async toggleItemCheck(e) {
    if (!this.ensureCanModifyItems()) {
      return;
    }
    if (this.data.isUpdatingStatus) {
      return;
    }
    
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i.id === id || i.itemOverviewId === id);
    if (!item) return;
    
    this.setData({ isUpdatingStatus: true });
    
    try {
      if (item.checked) {
        await this.uncheckItem(item);
      } else {
        await this.checkItem(item);
      }
      await this.fetchItems(this.data.tripId);
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

  // 勾选物品
  async checkItem(item) {
    try {
      if (item.itemOverviewId && (!item.id || item.id === item.itemOverviewId)) {
        const response = await itemApi.add({
          tripId: this.data.tripId,
          itemOverviewId: item.itemOverviewId,
          categoryId: this.getCategoryIdByCode(this.getCategoryCodeByText(item.category)),
          name: item.name,
          note: '',
          priority: 'medium',
          checked: 0
        });
        
        if (!response.success) {
          throw new Error(response.message || '添加物品失败');
        }
      } else {
        const actualItemId = item.id && item.id !== item.itemOverviewId ? item.id : item.itemOverviewId;
        const response = await itemApi.updateCheckedStatus(actualItemId, 0);
        if (!response.success) {
          throw new Error(response.message || '更新物品状态失败');
        }
      }
    } catch (error) {
      console.error('勾选物品错误:', error);
      throw error;
    }
  },
  
  // 取消勾选物品
  async uncheckItem(item) {
    try {
      if (item.id && item.id !== item.itemOverviewId) {
        const response = await itemApi.delete(item.id);
        if (!response.success) {
          console.error('删除物品失败:', response.message);
        }
      }
    } catch (error) {
      console.error('取消勾选物品错误:', error);
      throw error;
    }
  },

  goBack() {
    wx.navigateBack();
  },

  ensureCanModifyItems() {
    if (this.data.canModifyItems) {
      return true;
    }
    wx.showToast({
      title: '行程已完成，无法再修改物品',
      icon: 'none'
    });
    return false;
  },

  isTripLocked(status) {
    if (!status) return false;
    const normalized = String(status).toLowerCase();
    return normalized === 'completed' || normalized === 'cancelled';
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
  },

  // 根据分类文本获取分类代码
  getCategoryCodeByText(categoryText) {
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
    return map[categoryText] || 'OTHERS';
  },

  // --- 弹窗逻辑 ---
  openAddModal() {
    if (!this.ensureCanModifyItems()) {
      return;
    }
    this.setData({ 
      isAddModalOpen: true,
      'newItem.name': '',
      'newItem.category': '证件类',
      'newItem.desc': '',
      'newItem.note': ''
    });
  },

  closeAddModal() {
    this.setData({ isAddModalOpen: false });
  },

  onNameInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'newItem.name': '' });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 'newItem.name': value });
  },

  onDescInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'newItem.desc': '' });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 'newItem.desc': value });
  },

  onNoteInput(e) {
    const value = e.detail.value;
    if (containsSensitiveWord(value)) {
      this.setData({ 'newItem.note': '' });
      wx.showToast({
        title: '有敏感词请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 'newItem.note': value });
  },

  selectCategory(e) {
    this.setData({ 'newItem.category': e.currentTarget.dataset.name });
  },

  resetForm() {
    this.setData({
      'newItem.name': '',
      'newItem.category': '证件类',
      'newItem.desc': '',
      'newItem.note': ''
    });
  },

  // 确认入库
  async addItemToChecklist() {
    const { name, category, desc, note } = this.data.newItem;
    if (!name || !name.trim()) {
      wx.showToast({
        title: '请输入物品名称',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ loading: true });
      
      const categoryCode = CATEGORY_NAME_TO_CODE[category] || 'OTHERS';
      const categoryId = this.getCategoryIdByCode(categoryCode);
      
      const response = await itemOverviewApi.add({
        name: name.trim(),
        categoryId: categoryId,
        description: desc || '',
        note: note || '',
        userId: getCurrentUserId()
      });

      if (response.success) {
        wx.showToast({ 
          title: '添加成功', 
          icon: 'success' 
        });
        
        this.setData({ isAddModalOpen: false });
        await this.fetchItems(this.data.tripId);
        this.resetForm();
      } else {
        wx.showToast({
          title: response.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('添加物品失败:', error);
      wx.showToast({
        title: '添加失败，请检查网络连接',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
