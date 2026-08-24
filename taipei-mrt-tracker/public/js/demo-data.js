// 示範資料（Demo Data）
//
// 這份資料讓網站在「尚未設定 TDX API 金鑰」時也能立刻展示介面與互動效果。
// 車站座標為概略位置，僅供展示用，正式上線後請改用 /api/stations、
// /api/shapes 取得的 TDX 官方資料（server/index.js 已經寫好代理路由）。

const DEMO_LINES = [
  { id: 'R', name: '淡水信義線', color: '#e3002c' },
  { id: 'BL', name: '板南線', color: '#0070bd' },
  { id: 'G', name: '松山新店線', color: '#008659' },
];

const DEMO_STATIONS = [
  // 淡水信義線 R（節錄，由北至南）
  { id: 'R28', name: '淡水', lineId: 'R', seq: 0, lat: 25.1700, lng: 121.4487 },
  { id: 'R27', name: '紅樹林', lineId: 'R', seq: 1, lat: 25.1544, lng: 121.4581 },
  { id: 'R22', name: '北投', lineId: 'R', seq: 2, lat: 25.1321, lng: 121.4988 },
  { id: 'R16', name: '士林', lineId: 'R', seq: 3, lat: 25.0919, lng: 121.5259 },
  { id: 'R14', name: '圓山', lineId: 'R', seq: 4, lat: 25.0706, lng: 121.5203 },
  { id: 'R13', name: '民權西路', lineId: 'R', seq: 5, lat: 25.0629, lng: 121.5195 },
  { id: 'R10', name: '台北車站', lineId: 'R', seq: 6, lat: 25.0478, lng: 121.5170 },
  { id: 'R8', name: '中正紀念堂', lineId: 'R', seq: 7, lat: 25.0323, lng: 121.5178 },
  { id: 'R6', name: '大安森林公園', lineId: 'R', seq: 8, lat: 25.0330, lng: 121.5352 },
  { id: 'R3', name: '台北101/世貿', lineId: 'R', seq: 9, lat: 25.0330, lng: 121.5645 },
  { id: 'R2', name: '象山', lineId: 'R', seq: 10, lat: 25.0273, lng: 121.5679 },

  // 板南線 BL（節錄，由西至東）
  { id: 'BL12', name: '龍山寺', lineId: 'BL', seq: 0, lat: 25.0353, lng: 121.5000 },
  { id: 'BL11', name: '西門', lineId: 'BL', seq: 1, lat: 25.0421, lng: 121.5083 },
  { id: 'BL10', name: '台北車站', lineId: 'BL', seq: 2, lat: 25.0478, lng: 121.5170 },
  { id: 'BL8', name: '忠孝新生', lineId: 'BL', seq: 3, lat: 25.0418, lng: 121.5350 },
  { id: 'BL7', name: '忠孝復興', lineId: 'BL', seq: 4, lat: 25.0418, lng: 121.5436 },
  { id: 'BL5', name: '國父紀念館', lineId: 'BL', seq: 5, lat: 25.0409, lng: 121.5566 },
  { id: 'BL4', name: '市政府', lineId: 'BL', seq: 6, lat: 25.0409, lng: 121.5677 },
  { id: 'BL2', name: '後山埔', lineId: 'BL', seq: 7, lat: 25.0448, lng: 121.5854 },
  { id: 'BL1', name: '昆陽', lineId: 'BL', seq: 8, lat: 25.0499, lng: 121.5975 },

  // 松山新店線 G（節錄，由北至南）
  { id: 'G19', name: '松山', lineId: 'G', seq: 0, lat: 25.0499, lng: 121.5578 },
  { id: 'G16', name: '南京復興', lineId: 'G', seq: 1, lat: 25.0521, lng: 121.5436 },
  { id: 'G14', name: '中山', lineId: 'G', seq: 2, lat: 25.0526, lng: 121.5205 },
  { id: 'G12', name: '西門', lineId: 'G', seq: 3, lat: 25.0421, lng: 121.5083 },
  { id: 'G10', name: '古亭', lineId: 'G', seq: 4, lat: 25.0263, lng: 121.5225 },
  { id: 'G07', name: '公館', lineId: 'G', seq: 5, lat: 25.0146, lng: 121.5343 },
  { id: 'G03', name: '新店', lineId: 'G', seq: 6, lat: 24.9678, lng: 121.5399 },
];

const DEMO_DESTINATIONS = {
  R: ['淡水', '象山'],
  BL: ['頂埔', '南港展覽館'],
  G: ['新店', '松山'],
};

// 產生一批「假的」即時到站資料，格式盡量貼近 TDX LiveBoard 回傳結構，
// 讓 app.js 的解析邏輯可以在真實資料與示範資料之間無痛切換。
function generateDemoLiveBoard() {
  const now = Date.now();
  const rows = [];
  DEMO_STATIONS.forEach((st) => {
    const destOptions = DEMO_DESTINATIONS[st.lineId] || [];
    // 每站隨機產生 1~2 筆即將進站的列車
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      rows.push({
        StationID: st.id,
        LineID: st.lineId,
        DestinationName: destOptions[Math.floor(Math.random() * destOptions.length)] || '',
        CountDown: Math.floor(20 + Math.random() * 220), // 20~240 秒
        UpdateTime: new Date(now).toISOString(),
      });
    }
  });
  return rows;
}
