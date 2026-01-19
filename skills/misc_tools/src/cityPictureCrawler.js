// 简易城市图片爬虫：通过请求 Bing 图片搜索结果页面解析图片 URL
// 注意：在真机或预览前，需要将 https://cn.bing.com 和 https://source.unsplash.com
// 添加到小程序的 request 合法域名列表中

const DEFAULT_LIMIT = 6;
const CITY_PICTURE_CACHE_KEY = 'CITY_PICTURE_CACHE';
const TRIP_COVER_STORAGE_KEY = 'TRIP_COVER_STORAGE';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function extractImageUrls(html) {
  if (!html || typeof html !== 'string') return [];
  const urls = [];
  const regex = /murl&quot;:&quot;(.*?)&quot;/g;
  let match = regex.exec(html);
  while (match) {
    const decoded = decodeHtmlEntities(match[1]);
    if (decoded && decoded.startsWith('http')) {
      urls.push(decoded);
    }
    match = regex.exec(html);
  }
  // 去重
  return Array.from(new Set(urls));
}

function buildFallbackUrl(keyword) {
  // 不再使用 unsplash，返回空字符串，让调用方使用本地默认图片
  return '';
}

function fetchCityPictures(keyword, limit = DEFAULT_LIMIT) {
  const searchKeyword = keyword && keyword.trim();
  if (!searchKeyword) {
    return Promise.resolve([]);
  }

  const encodedKeyword = encodeURIComponent(`${searchKeyword} 城市 风景`);
  const requestUrl = `https://cn.bing.com/images/search?q=${encodedKeyword}&form=HDRSC2&first=1`;

  return new Promise((resolve) => {
    try {
      wx.request({
        url: requestUrl,
        method: 'GET',
        header: {
          'Content-Type': 'text/html; charset=utf-8'
        },
        timeout: 5000, // 5秒超时
        success: (res) => {
          try {
            const html = res.data || '';
            const urls = extractImageUrls(html).slice(0, limit);
            if (urls.length > 0) {
              resolve(urls);
            } else {
              // 不再使用 unsplash，返回空数组，让调用方使用本地默认图片
              resolve([]);
            }
          } catch (error) {
            console.error('解析图片URL失败:', error);
            resolve([]);
          }
        },
        fail: (error) => {
          // 静默失败，不抛出错误，返回空数组让调用方使用本地默认图片
          console.warn('获取城市图片失败，将使用本地默认图片:', error);
          resolve([]);
        }
      });
    } catch (error) {
      // 捕获所有可能的错误，确保不会抛出未捕获的异常
      console.error('fetchCityPictures 异常:', error);
      resolve([]);
    }
  });
}

function extractPrimaryCityName(displayName) {
  if (!displayName || typeof displayName !== 'string') return '';
  const segments = displayName.split(/·|,|\s+/).map(item => item.trim()).filter(Boolean);
  if (segments.length === 0) {
    return displayName.trim();
  }
  return segments[2]+"风景";
}

function normalizeDestinationKey(destination) {
  return (destination || '').trim();
}

function getCityPictureCache(destination) {
  const key = normalizeDestinationKey(destination);
  if (!key) return null;
  const cache = wx.getStorageSync(CITY_PICTURE_CACHE_KEY) || {};
  return cache[key] || null;
}

function saveCityPictureCache(destination, pictures = []) {
  const key = normalizeDestinationKey(destination);
  if (!key || !pictures || pictures.length === 0) return null;
  const cache = wx.getStorageSync(CITY_PICTURE_CACHE_KEY) || {};
  cache[key] = {
    list: pictures,
    cover: pictures[0],
    updatedAt: Date.now()
  };
  wx.setStorageSync(CITY_PICTURE_CACHE_KEY, cache);
  return cache[key];
}

function getTripCoverStorage() {
  return wx.getStorageSync(TRIP_COVER_STORAGE_KEY) || {};
}

function getPersistedTripCover(tripId) {
  if (!tripId) return '';
  const map = getTripCoverStorage();
  return map[tripId] || '';
}

function savePersistedTripCover(tripId, url) {
  if (!tripId) return null;
  const map = getTripCoverStorage();
  if (!url) {
    delete map[tripId];
  } else {
    map[tripId] = url;
  }
  wx.setStorageSync(TRIP_COVER_STORAGE_KEY, map);
  return map;
}

module.exports = {
  fetchCityPictures,
  extractPrimaryCityName,
  getCityPictureCache,
  saveCityPictureCache,
  getPersistedTripCover,
  savePersistedTripCover,
  getTripCoverStorage
};

