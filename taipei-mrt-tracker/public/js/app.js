// 台北捷運即時列車位置系統 - 前端邏輯
// 架構：
//   1. 嘗試向後端 /api/* 取得 TDX 真實資料
//   2. 若後端沒開、或尚未設定金鑰 -> 自動退回 demo-data.js 的示範資料
//   3. 用「到站倒數秒數」內插推算列車在路線上的近似位置（非精確 GPS）

const NOMINAL_SEGMENT_SECONDS = 120; // 假設相鄰兩站間的行駛時間（示範用）
const POLL_INTERVAL_MS = 15000;

const state = {
  usingLiveData: false,
  lines: [],
  stations: [],
  stationsById: new Map(),
  activeLineIds: new Set(),
  selectedStationId: null,
  liveboard: [],
  trainMarkers: new Map(), // key -> Leaflet marker
};

const el = {
  dataModeLabel: document.getElementById('dataModeLabel'),
  lineFilters: document.getElementById('lineFilters'),
  stationSearch: document.getElementById('stationSearch'),
  stationResults: document.getElementById('stationResults'),
  arrivalPanel: document.getElementById('arrivalPanel'),
  arrivalStationName: document.getElementById('arrivalStationName'),
  arrivalList: document.getElementById('arrivalList'),
  updateBadge: document.getElementById('updateBadge'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  themeToggle: document.getElementById('themeToggle'),
};

let map;
let lineLayerGroup;
let stationLayerGroup;
let trainLayerGroup;

init();

async function init() {
  initTheme();
  initSidebarToggle();
  initMap();

  await loadStaticData();
  renderLineFilters();
  renderRoutesAndStations();

  el.stationSearch.addEventListener('input', onStationSearch);

  await refreshLiveboard();
  setInterval(refreshLiveboard, POLL_INTERVAL_MS);
}

// ---------- 主題 / RWD ----------
function initTheme() {
  const saved = safeGet('mrt-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  el.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      safeSet('mrt-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      safeSet('mrt-theme', 'dark');
    }
  });
}

function initSidebarToggle() {
  el.sidebarToggle.addEventListener('click', () => {
    el.sidebar.classList.toggle('open');
  });
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { /* ignore */ }
}

// ---------- 地圖 ----------
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([25.045, 121.535], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  lineLayerGroup = L.layerGroup().addTo(map);
  stationLayerGroup = L.layerGroup().addTo(map);
  trainLayerGroup = L.layerGroup().addTo(map);
}

// ---------- 資料載入 ----------

// TDX 台北捷運的 StationID 本身就是「路線代碼 + 序號」（例如 BL01、R28、G03A），
// 車站基本資料 API 並不會另外附上 LineID / StationSequence 欄位，
// 所以路線歸屬與站序改用 StationID 直接解析，不依賴額外欄位。
const LINE_META = {
  R: { name: '淡水信義線', color: '#e3002c' },
  BL: { name: '板南線', color: '#0070bd' },
  G: { name: '松山新店線', color: '#008659' },
  O: { name: '中和新蘆線', color: '#f8b61c' },
  BR: { name: '文湖線', color: '#c48c31' },
  Y: { name: '環狀線', color: '#fdd035' },
};

async function loadStaticData() {
  try {
    const status = await fetchJSON('/api/status');
    if (status && status.configured) {
      const stationsRaw = await fetchJSON('/api/stations');
      const stations = normalizeStations(stationsRaw);
      if (stations.length) {
        state.stations = stations;
        state.lines = buildLinesFromStations(stations);
        state.usingLiveData = true;
      }
    }
  } catch (err) {
    console.warn('無法取得 TDX 即時資料，改用示範資料。', err.message);
  }

  if (!state.usingLiveData) {
    state.stations = DEMO_STATIONS;
    state.lines = DEMO_LINES;
  }

  state.stationsById = new Map(state.stations.map((s) => [s.id, s]));
  state.activeLineIds = new Set(state.lines.map((l) => l.id));

  renderDataModeLabel();
}

function renderDataModeLabel() {
  el.dataModeLabel.textContent = state.usingLiveData ? t('dataModeLive') : t('dataModeDemo');
}

function buildLinesFromStations(stations) {
  const ids = [...new Set(stations.map((s) => s.lineId))];
  return ids.map((id) => {
    const meta = LINE_META[id] || { name: id, color: '#666666' };
    return { id, name: meta.name, color: meta.color };
  });
}

// TDX 原始格式轉換：StationID 例如 "BL01"、"R28"、"G03A" → 路線代碼 + 序號
function normalizeStations(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  raw.forEach((s) => {
    const pos = s.StationPosition || {};
    if (!pos.PositionLat || !pos.PositionLon) return;
    const match = String(s.StationID || '').match(/^([A-Za-z]+)(\d+)([A-Za-z]*)$/);
    if (!match) return;
    const lineId = match[1];
    const seq = parseInt(match[2], 10) + (match[3] ? 0.5 : 0);
    out.push({
      id: s.StationID,
      name: (s.StationName && s.StationName.Zh_tw) || s.StationID,
      lineId,
      seq,
      lat: pos.PositionLat,
      lng: pos.PositionLon,
    });
  });
  return out.filter((s) => s.lat && s.lng);
}

// ---------- 路線 / 車站 繪製 ----------
function renderLineFilters() {
  el.lineFilters.innerHTML = '';
  state.lines.forEach((line) => {
    const chip = document.createElement('div');
    chip.className = 'line-chip active';
    chip.style.background = line.color;
    chip.style.color = '#fff';
    chip.innerHTML = `<span class="swatch"></span>${line.name}`;
    chip.addEventListener('click', () => toggleLine(line.id, chip));
    el.lineFilters.appendChild(chip);
  });
}

function toggleLine(lineId, chipEl) {
  if (state.activeLineIds.has(lineId)) {
    state.activeLineIds.delete(lineId);
    chipEl.classList.remove('active');
    chipEl.style.background = 'transparent';
    chipEl.style.color = 'var(--text)';
  } else {
    state.activeLineIds.add(lineId);
    const line = state.lines.find((l) => l.id === lineId);
    chipEl.classList.add('active');
    chipEl.style.background = line.color;
    chipEl.style.color = '#fff';
  }
  renderRoutesAndStations();
  renderTrains(); // 立即依篩選重新繪製列車
}

function renderRoutesAndStations() {
  lineLayerGroup.clearLayers();
  stationLayerGroup.clearLayers();

  state.lines.forEach((line) => {
    if (!state.activeLineIds.has(line.id)) return;
    const pts = state.stations
      .filter((s) => s.lineId === line.id)
      .sort((a, b) => a.seq - b.seq)
      .map((s) => [s.lat, s.lng]);
    if (pts.length > 1) {
      L.polyline(pts, { color: line.color, weight: 4, opacity: 0.85 }).addTo(lineLayerGroup);
    }
  });

  state.stations.forEach((s) => {
    if (!state.activeLineIds.has(s.lineId)) return;
    const icon = L.divIcon({ className: 'station-icon', iconSize: [9, 9] });
    const marker = L.marker([s.lat, s.lng], { icon }).addTo(stationLayerGroup);
    marker.bindTooltip(s.name, { direction: 'top', offset: [0, -4] });
    marker.on('click', () => selectStation(s.id));
    marker.stationId = s.id;
  });
}

// ---------- 車站搜尋 / 到站查詢 ----------
function onStationSearch() {
  const q = el.stationSearch.value.trim();
  el.stationResults.innerHTML = '';
  if (!q) return;
  const uniqueByName = new Map();
  state.stations
    .filter((s) => s.name.includes(q))
    .forEach((s) => {
      if (!uniqueByName.has(s.name)) uniqueByName.set(s.name, s);
    });
  [...uniqueByName.values()].slice(0, 12).forEach((s) => {
    const item = document.createElement('div');
    item.className = 'station-result-item';
    item.textContent = s.name;
    item.addEventListener('click', () => selectStation(s.id));
    el.stationResults.appendChild(item);
  });
}

function selectStation(stationId) {
  state.selectedStationId = stationId;
  const station = state.stationsById.get(stationId);
  if (!station) return;

  map.flyTo([station.lat, station.lng], 15, { duration: 0.6 });

  el.arrivalPanel.hidden = false;
  el.arrivalStationName.textContent = `${station.name}${t('arrivalTitleSuffix')}`;
  renderArrivalsForSelectedStation();

  if (window.innerWidth <= 820) el.sidebar.classList.remove('open');
}

function renderArrivalsForSelectedStation() {
  if (!state.selectedStationId) return;
  const station = state.stationsById.get(state.selectedStationId);
  if (!station) return;

  // 同名車站可能對應多條路線（例如台北車站、西門），一併列出
  const relatedStationIds = state.stations
    .filter((s) => s.name === station.name)
    .map((s) => s.id);

  const rows = state.liveboard.filter((r) => relatedStationIds.includes(r.StationID));

  el.arrivalList.innerHTML = '';
  if (!rows.length) {
    el.arrivalList.innerHTML = `<p class="note">${t('noArrival')}</p>`;
    return;
  }

  rows
    .sort((a, b) => a.CountDown - b.CountDown)
    .forEach((r) => {
      const row = document.createElement('div');
      row.className = 'arrival-row';
      const timeText = formatCountdown(r.CountDown);
      row.innerHTML = `
        <div>
          <div>${t('towards')} ${r.DestinationName || '—'}</div>
          <div class="dest">${lineName(r.LineID)}</div>
        </div>
        <div class="countdown ${r.CountDown <= 60 ? 'soon' : ''}">${timeText}</div>
      `;
      el.arrivalList.appendChild(row);
    });
}

function formatCountdown(countDown) {
  if (countDown <= 60) return t('arriving');
  const mins = Math.floor(countDown / 60);
  const secs = countDown % 60;
  const lang = getCurrentLang();
  if (lang === 'zh-TW') return `${mins} 分 ${secs} 秒`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function lineName(lineId) {
  const l = state.lines.find((x) => x.id === lineId);
  return l ? l.name : lineId;
}

// ---------- 即時到站 / 列車位置推算 ----------
async function refreshLiveboard() {
  let rows = [];
  if (state.usingLiveData) {
    try {
      const raw = await fetchJSON('/api/liveboard');
      rows = normalizeLiveBoard(raw);
    } catch (err) {
      console.warn('取得即時到站失敗，暫用示範資料代替。', err.message);
      rows = generateDemoLiveBoard();
    }
  } else {
    rows = generateDemoLiveBoard();
  }

  state.liveboard = rows;
  renderTrains();
  if (state.selectedStationId) renderArrivalsForSelectedStation();

  const now = new Date();
  el.updateBadge.textContent = `${t('updatePrefix')}${now.toLocaleTimeString('zh-TW', { hour12: false })}`;
}

function normalizeLiveBoard(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    StationID: r.StationID,
    LineID: r.LineID,
    DestinationName: (r.DestinationStationName && r.DestinationStationName.Zh_tw) || '',
    CountDown: typeof r.EstimateTime === 'number' ? r.EstimateTime : 999,
  }));
}

// 用「到站倒數」把列車內插畫在『上一站 -> 即將抵達站』的線段上
function renderTrains() {
  trainLayerGroup.clearLayers();
  state.trainMarkers.clear();

  state.liveboard.forEach((r, idx) => {
    if (!state.activeLineIds.has(r.LineID)) return;
    const arrivingStation = state.stationsById.get(r.StationID);
    if (!arrivingStation) return;

    const prevStation = findPreviousStation(arrivingStation);
    const from = prevStation || arrivingStation;
    const to = arrivingStation;

    const fraction = clamp(1 - r.CountDown / NOMINAL_SEGMENT_SECONDS, 0.05, 0.95);
    const lat = lerp(from.lat, to.lat, fraction);
    const lng = lerp(from.lng, to.lng, fraction);

    const icon = L.divIcon({ className: 'train-icon', iconSize: [14, 14] });
    const marker = L.marker([lat, lng], { icon }).addTo(trainLayerGroup);
    marker.bindTooltip(
      `往 ${r.DestinationName || '—'}・${Math.max(r.CountDown, 0)} 秒後到 ${to.name}`,
      { direction: 'top' }
    );
    state.trainMarkers.set(`${r.LineID}-${idx}`, marker);
  });
}

function findPreviousStation(station) {
  const sameLine = state.stations
    .filter((s) => s.lineId === station.lineId)
    .sort((a, b) => a.seq - b.seq);
  const idx = sameLine.findIndex((s) => s.id === station.id);
  if (idx > 0) return sameLine[idx - 1];
  return null;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// 語言切換時，重繪所有含有動態文字（非 data-i18n 靜態字串）的區塊
window.onLanguageChanged = function onLanguageChanged() {
  renderDataModeLabel();
  if (state.selectedStationId) renderArrivalsForSelectedStation();
  renderTrains();
};

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url} -> HTTP ${resp.status}`);
  const json = await resp.json();
  if (json && json.error) throw new Error(json.error);
  return json;
}
