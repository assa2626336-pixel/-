# 台北捷運即時列車位置系統

簡約實用風格的台北捷運（TRTC）即時資訊網站。支援路線篩選、車站到站時間查詢、
深色模式、手機版 RWD、繁中/英文/日文介面、API 說明頁。資料來源為
[TDX 運輸資料流通服務平臺](https://tdx.transportdata.tw/)。

對應 PRD v0.2：F1～F7 已全數完成（F1 列車位置、F2 到站查詢、F3 路線篩選、
F4 深色模式、F5 RWD、F6 多語言、F7 API 展示頁）。原規劃的路網壅擠/誤點狀態
已與需求方確認不做。

## 重要說明：關於「即時列車位置」

台北捷運目前並未對外公開列車的精確 GPS 座標，TDX 提供的是**各站即時到站時間預估
（LiveBoard）**。本網站據此，用「到站倒數秒數」在地圖上把列車內插繪製在
「上一站 → 即將抵達站」的路線區間上，藉此呈現近似的行駛位置與動態感——
這是類似情境下常見的視覺化做法，但**不是**車輛的實際即時 GPS 位置，介面上也已加註說明。

## 快速開始（示範模式，不需要金鑰）

```bash
npm install
npm start
```

打開 http://localhost:3000 ，此時網站會以**示範資料**運作（畫面右上角會顯示
「● 示範資料」），可以先體驗地圖、路線篩選、到站查詢、深色模式、多語言等完整互動效果。

---

## 步驟一：申請 TDX API 金鑰（你需要親自操作的部分）

因為需要你自己的帳號登入、同意條款，這一步無法由我代為完成，請照著做：

1. 前往 [TDX 會員中心](https://tdx.transportdata.tw/) → 右上角「登入/註冊」，用 Email 或第三方帳號註冊（免費）。
2. 註冊完成並登入後，點選右上角帳號選單 →「會員中心」。
3. 左側選單找「金鑰管理」（API Key Management）→「新增金鑰」。
4. 建立完成後，畫面會顯示一組 **Client ID** 與 **Client Secret**，請先複製起來妥善保存
   （Secret 通常只會顯示一次）。
5. 免費額度目前為每日一定次數的呼叫量（實際數字以 TDX 官網公告為準），一般個人網站
   使用綽綽有餘；正式上線後若流量變大，可以在會員中心查詢用量。

拿到 Client ID / Secret 之後：

```bash
cp .env.example .env
# 打開 .env，填入：
# TDX_CLIENT_ID=你的-client-id
# TDX_CLIENT_SECRET=你的-client-secret
npm start
```

重新整理網頁，右上角會從「● 示範資料」變成「● 即時資料」，地圖就會改用 TDX 的
真實車站座標、路線與到站看板資料。伺服器（`server/index.js`）負責向 TDX 交換
access token 並代理 API 請求，`client_secret` 只會留在後端，不會出現在瀏覽器端的
程式碼中。

---

## 步驟二：部署到公開網址（你需要親自操作的部分）

以下用 **Render**（有免費方案、設定簡單）示範，Railway / Zeabur 流程也大同小異：

1. **把程式碼放到 GitHub**：在 GitHub 建立一個新的 repository，把這個資料夾的內容
   push 上去（如果你不熟悉 git 指令，可以直接在 GitHub 網頁用「Upload files」把整個
   資料夾拖上去，但要記得**不要上傳 `.env` 和 `node_modules`**，`.gitignore` 已經幫你
   排除了）。
2. 到 [Render](https://render.com/) 註冊帳號，選「New +」→「Web Service」。
3. 選擇「Connect a repository」，授權並選取你剛才建立的 GitHub repo。
   （Render 偵測到本專案根目錄有 `render.yaml`，會自動帶入建置設定。）
4. 在 Render 的「Environment」頁籤，手動新增兩個環境變數：
   - `TDX_CLIENT_ID` = 你的 Client ID
   - `TDX_CLIENT_SECRET` = 你的 Client Secret
   （這兩個是機密資訊，故意不寫進 `render.yaml`，需要你手動填入。）
5. 按「Deploy」，等待建置完成，Render 會給你一個類似
   `https://taipei-mrt-tracker.onrender.com` 的公開網址。
6. 之後想更新網站，只要把新的程式碼 push 到 GitHub，Render 預設會自動重新部署。

> 提醒：Render 免費方案的服務閒置一段時間會「休眠」，下次有人開啟網站時，
> 第一次載入可能會慢個幾秒到十幾秒，這是免費方案的正常現象。若在意這點，
> 可以之後再評估升級付費方案。

如果你想先加上自己的網域名稱，可以在 Render 服務的「Settings → Custom Domains」
設定，並到你的網域註冊商後台加一筆 CNAME 紀錄，細節依你使用的網域商而定，
需要的話再跟我說，我可以照你的網域商列出對應步驟。

---

## 專案結構

```
taipei-mrt-tracker/
├── server/index.js       # Express 後端：TDX 授權、API 代理、靜態檔案伺服器
├── public/
│   ├── index.html          # 地圖主頁
│   ├── api.html             # API 說明頁（服務開發者族群）
│   ├── css/style.css        # 淺色/深色主題、RWD
│   └── js/
│       ├── i18n.js           # 繁中/英文/日文介面文字
│       ├── demo-data.js      # 示範資料（無金鑰時使用）
│       └── app.js            # 地圖繪製、篩選、到站查詢、列車位置推算
├── render.yaml             # Render 部署設定
├── .env.example
└── package.json
```

## 已實作的功能（對應 PRD v0.2）

- F1 地圖顯示捷運路網與車站，依到站倒數內插推算的近似列車位置（Leaflet + OpenStreetMap）
- F2 車站搜尋 + 到站時間查詢面板
- F3 路線篩選 / 切換（點擊圖例上的路線色塊）
- F4 深色模式（記住上次選擇）
- F5 手機版 RWD（側邊欄可收合）
- F6 多語言介面（繁中 / English / 日本語，右上角切換）
- F7 API 說明頁（`/api.html`），列出所有後端端點供開發者參考

## 之後可以再擴充的方向

- 用 TDX `Metro/Shape` 的實際路線幾何座標取代目前的直線連接，路線圖會更貼近真實線型
- 若 TDX 未來釋出壅擠度 / 誤點相關資料集，可再評估是否納入
- 自訂網域、CDN、監控告警等正式站台維運項目
