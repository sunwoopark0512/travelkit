// 天气文案映射工具，避免出现“？”的占位

const WEATHER_TEXT_MAP = {
  'sunny': '晴',
  'clear': '晴',
  'cloudy': '多云',
  'few clouds': '少云',
  'partly cloudy': '晴间多云',
  'overcast': '阴',
  'rain': '雨',
  'light rain': '小雨',
  'moderate rain': '中雨',
  'heavy rain': '大雨',
  'storm': '暴雨',
  'thundershower': '雷阵雨',
  'shower': '阵雨',
  'snow': '雪',
  'light snow': '小雪',
  'moderate snow': '中雪',
  'heavy snow': '大雪',
  'sleet': '雨夹雪',
  'fog': '雾',
  'haze': '霾',
  'sandstorm': '沙尘暴',
  'wind': '有风',
  'breezy': '微风',
  'hot': '炎热',
  'cold': '寒冷'
};

const WEATHER_ICON_TEXT_MAP = {
  100: '晴',
  101: '多云',
  102: '少云',
  103: '晴间多云',
  104: '阴',
  150: '晴（夜）',
  151: '多云（夜）',
  152: '少云（夜）',
  153: '晴间多云（夜）',
  154: '阴（夜）',
  300: '阵雨',
  301: '强阵雨',
  302: '雷阵雨',
  303: '强雷阵雨',
  304: '雷阵雨伴有冰雹',
  305: '小雨',
  306: '中雨',
  307: '大雨',
  308: '极端降雨',
  309: '毛毛雨',
  310: '暴雨',
  311: '大暴雨',
  312: '特大暴雨',
  313: '冻雨',
  314: '小到中雨',
  315: '中到大雨',
  316: '大到暴雨',
  317: '暴雨到大暴雨',
  318: '大暴雨到特大暴雨',
  399: '雨',
  400: '小雪',
  401: '中雪',
  402: '大雪',
  403: '暴雪',
  404: '雨夹雪',
  405: '雨雪天气',
  406: '阵雨夹雪',
  407: '阵雪',
  408: '小到中雪',
  409: '中到大雪',
  410: '大到暴雪',
  499: '雪',
  500: '薄雾',
  501: '雾',
  502: '霾',
  503: '扬沙',
  504: '浮尘',
  507: '沙尘暴',
  508: '强沙尘暴',
  509: '浓雾',
  510: '强浓雾',
  511: '中度霾',
  512: '重度霾',
  513: '严重霾',
  514: '大雾',
  515: '特强浓雾',
  900: '热',
  901: '冷',
  999: '未知'
};

function normalizeWeatherText(rawText, iconCode, period = 'day') {
  const cleaned = (rawText || '').trim();
  if (cleaned && cleaned !== '?' && cleaned !== '??') {
    const lower = cleaned.toLowerCase();
    if (WEATHER_TEXT_MAP[lower]) {
      return WEATHER_TEXT_MAP[lower];
    }
    return cleaned;
  }

  const iconNum = parseInt(iconCode, 10);
  if (!Number.isNaN(iconNum) && WEATHER_ICON_TEXT_MAP[iconNum]) {
    return WEATHER_ICON_TEXT_MAP[iconNum];
  }

  return period === 'night' ? '夜间多云' : '多云';
}

module.exports = {
  normalizeWeatherText
};
