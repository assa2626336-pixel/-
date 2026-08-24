// 簡易多語言支援（繁中 / English / 日本語）
// 用法：需要翻譯的元素加上 data-i18n="key"，翻譯字典見下方 I18N。

const I18N = {
  'zh-TW': {
    title: '台北捷運即時列車位置',
    dataModeLive: '● 即時資料（TDX 運輸資料流通服務平臺）',
    dataModeDemo: '● 示範資料（尚未設定 TDX 金鑰）',
    lineFilters: '路線篩選',
    stationQuery: '車站到站時間查詢',
    stationPlaceholder: '輸入車站名稱，例如：台北車站',
    arrivalTitleSuffix: ' 到站時間',
    legend: '圖例',
    legendTrain: '列車（依到站時間估算位置）',
    legendStation: '車站',
    legendNote: '列車位置為依「到站時間預估」內插推算之近似位置，非車輛實際 GPS 座標。',
    noArrival: '目前查無到站資料',
    towards: '往',
    arriving: '即將進站',
    apiLink: 'API 說明',
    updatePrefix: '最後更新：',
    notUpdated: '尚未更新',
  },
  en: {
    title: 'Taipei MRT Live Train Tracker',
    dataModeLive: '● Live Data (TDX Transport Data Exchange)',
    dataModeDemo: '● Demo Data (TDX API key not configured)',
    lineFilters: 'Line Filter',
    stationQuery: 'Station Arrival Lookup',
    stationPlaceholder: 'Enter a station name, e.g. Taipei Main Station',
    arrivalTitleSuffix: ' Arrivals',
    legend: 'Legend',
    legendTrain: 'Train (estimated from arrival time)',
    legendStation: 'Station',
    legendNote: 'Train positions are approximated by interpolating estimated arrival times, not actual vehicle GPS coordinates.',
    noArrival: 'No arrival data available',
    towards: 'To',
    arriving: 'Arriving',
    apiLink: 'API Docs',
    updatePrefix: 'Last updated: ',
    notUpdated: 'Not updated yet',
  },
  ja: {
    title: '台北MRTリアルタイム列車位置',
    dataModeLive: '● ライブデータ（TDX 運輸資料流通服務平臺）',
    dataModeDemo: '● デモデータ（TDX APIキー未設定）',
    lineFilters: '路線フィルター',
    stationQuery: '駅の到着時刻検索',
    stationPlaceholder: '駅名を入力（例：台北車站）',
    arrivalTitleSuffix: ' 到着時刻',
    legend: '凡例',
    legendTrain: '列車（到着予測時間から推定した位置）',
    legendStation: '駅',
    legendNote: '列車の位置は到着予測時間から補間して推定した近似位置であり、実際のGPS座標ではありません。',
    noArrival: '到着情報がありません',
    towards: '行き先',
    arriving: 'まもなく到着',
    apiLink: 'API情報',
    updatePrefix: '最終更新：',
    notUpdated: '未更新',
  },
};

const LANG_ORDER = ['zh-TW', 'en', 'ja'];

function getCurrentLang() {
  try {
    const saved = localStorage.getItem('mrt-lang');
    if (saved && I18N[saved]) return saved;
  } catch (e) { /* ignore */ }
  return 'zh-TW';
}

function setCurrentLang(lang) {
  try { localStorage.setItem('mrt-lang', lang); } catch (e) { /* ignore */ }
}

function t(key) {
  const lang = getCurrentLang();
  return (I18N[lang] && I18N[lang][key]) || I18N['zh-TW'][key] || key;
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((elm) => {
    const key = elm.getAttribute('data-i18n');
    elm.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((elm) => {
    const key = elm.getAttribute('data-i18n-placeholder');
    elm.setAttribute('placeholder', t(key));
  });
  document.title = t('title');
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = getCurrentLang() === 'zh-TW' ? '中' : getCurrentLang() === 'en' ? 'EN' : 'JA';
}

function initLangToggle() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = getCurrentLang();
    const idx = LANG_ORDER.indexOf(cur);
    const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    setCurrentLang(next);
    applyStaticTranslations();
    if (typeof window.onLanguageChanged === 'function') window.onLanguageChanged();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyStaticTranslations();
  initLangToggle();
});
