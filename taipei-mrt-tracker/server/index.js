// 台北捷運即時列車位置系統 - 後端伺服器
//
// 這個伺服器做兩件事：
// 1. 向 TDX (運輸資料流通服務平臺) 交換 access token，並快取起來
//    （client_secret 絕對不能放在前端 JS，所以由這裡的後端統一處理）
// 2. 提供幾支簡單的 REST API，前端只呼叫這裡，由這裡代為呼叫 TDX，
//    避免瀏覽器端的 CORS 與金鑰外洩問題

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TDX_CLIENT_ID = process.env.TDX_CLIENT_ID;
const TDX_CLIENT_SECRET = process.env.TDX_CLIENT_SECRET;

const AUTH_URL =
  'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const API_BASE = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro';

// ---- Token 快取 ----
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (!TDX_CLIENT_ID || !TDX_CLIENT_SECRET) {
    throw new Error(
      '尚未設定 TDX_CLIENT_ID / TDX_CLIENT_SECRET，請參考 .env.example 設定 .env 檔案'
    );
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: TDX_CLIENT_ID,
    client_secret: TDX_CLIENT_SECRET,
  });

  const resp = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TDX 取得 token 失敗 (${resp.status}): ${text}`);
  }

  const json = await resp.json();
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken;
}

async function tdxGet(pathSuffix) {
  const token = await getAccessToken();
  const url = `${API_BASE}${pathSuffix}${
    pathSuffix.includes('?') ? '&' : '?'
  }%24format=JSON`;
  const resp = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TDX API 錯誤 (${resp.status}) ${url}: ${text}`);
  }
  return resp.json();
}

// ---- API 路由（供前端呼叫） ----
// 車站基本資料（含經緯度）
app.get('/api/stations', async (req, res) => {
  try {
    const data = await tdxGet('/Station/TRTC');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 路網線型（畫路線用的座標）
app.get('/api/shapes', async (req, res) => {
  try {
    const data = await tdxGet('/Shape/TRTC');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 路線基本資料（路線顏色、名稱等）
app.get('/api/lines', async (req, res) => {
  try {
    const data = await tdxGet('/Line/TRTC');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 即時到站看板（用來估算列車目前大致位置 + 到站倒數）
app.get('/api/liveboard', async (req, res) => {
  try {
    const data = await tdxGet('/LiveBoard/TRTC');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// 是否已設定金鑰，前端用來顯示「示範資料 / 即時資料」提示
app.get('/api/status', (req, res) => {
  res.json({ configured: Boolean(TDX_CLIENT_ID && TDX_CLIENT_SECRET) });
});

// ---- 靜態前端 ----
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`台北捷運即時列車位置系統已啟動： http://localhost:${PORT}`);
  if (!TDX_CLIENT_ID || !TDX_CLIENT_SECRET) {
    console.log(
      '⚠️  尚未設定 TDX API 金鑰，目前只能顯示示範資料。請複製 .env.example 為 .env 並填入金鑰。'
    );
  }
});
