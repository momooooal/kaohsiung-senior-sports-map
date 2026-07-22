# 高雄銀髮運動地圖網站

## 專案說明

這是一個提供高齡者查詢高雄市運動資源的靜態互動網站。使用者可以依照行政區、資源分類或關鍵字，快速找到附近的運動中心、特色公園、可運動學校、運動i臺灣課程與運動園區。

網站設計以長者友善為核心，字體大、按鈕大、操作簡單，支援手機、平板與電腦。

---

## 功能

- 行政區篩選（11個重點行政區）
- 資源分類（運動中心、公園、可運動學校、運動i臺灣課程、運動／體育園區）
- 關鍵字搜尋（支援名稱、地址、設施、行政區等）
- 搜尋建議下拉選單（鍵盤可操作）
- 字體放大與縮小（90%〜130%，儲存於 localStorage）
- 詳細資訊手風琴展開
- 手機版響應式設計
- 長者友善與無障礙操作（ARIA 標籤、鍵盤支援）

---

## 專案檔案結構

```
/
├── index.html          主頁面
├── style.css           所有樣式
├── app.js              所有功能（JavaScript）
├── 404.html            找不到頁面時的提示
├── .nojekyll           停用 GitHub Pages Jekyll 處理
├── README.md           本說明文件
├── data/
│   ├── venues.json     運動中心與運動園區資料
│   ├── parks.json      特色公園資料
│   ├── schools.json    各行政區可運動學校數量
│   ├── courses.json    運動i臺灣課程資料
│   └── districts.json  11個重點行政區摘要資料
└── assets/
    ├── icons/          功能圖示（SVG）
    └── images/
        └── placeholder.svg  場館預設圖片
```

---

## 修改資料

所有資料存放於 `data/` 資料夾，使用 JSON 格式，可用記事本或文字編輯器開啟。

**運動中心 / 運動園區**（`data/venues.json`）：
- `nameZh`：中文名稱
- `address`：地址
- `phone`：電話
- `hours`：營業時間
- `website`：官方網站網址
- `facebook`：Facebook 頁面網址
- `facilities`：設施清單（陣列）
- `seniorBenefits`：長者優惠說明（陣列）
- `localBenefits`：里民優惠說明（陣列）

**特色公園**（`data/parks.json`）：
- 修改 `address`、`nameZh` 等欄位

**學校數量**（`data/schools.json`）：
- 修改各行政區的 `count` 欄位
- 修改 `queryUrl` 為教育局實際查詢網址

**運動i臺灣課程**（`data/courses.json`）：
- 修改 `summary` 欄位說明
- 修改 `url` 為實際課程連結

---

## 本機預覽

**注意**：直接雙擊 `index.html` 開啟時，瀏覽器的安全限制會阻擋 `fetch` 讀取 JSON 檔案，頁面可能無法顯示資料。

請使用以下任一方式預覽：

1. **Replit Preview**：在 Replit 環境中直接預覽
2. **VS Code Live Server**：安裝 Live Server 延伸套件後，右鍵 `index.html` → 「Open with Live Server」
3. **Python 簡易伺服器**（需安裝 Python）：
   ```
   cd kaohsiung-static
   python -m http.server 8080
   ```
   然後開啟瀏覽器前往 `http://localhost:8080`

---

## 上傳至 GitHub

1. 在 GitHub 建立新的 repository
2. 將 `kaohsiung-static/` 資料夾內的**所有檔案**（包含 `.nojekyll`）上傳至 repository 根目錄
3. 確認 `index.html` 位於 repository 的最外層

---

## 啟用 GitHub Pages

1. 進入 repository 的 **Settings**
2. 點選左側選單 **Pages**
3. Source 選擇 **Deploy from a branch**
4. Branch 選擇 **main**，資料夾選 **/ (root)**
5. 點擊 **Save**
6. 等待約 1〜2 分鐘後，即可透過 GitHub 提供的網址瀏覽網站

---

## GitHub Pages 相容性說明

本專案所有檔案路徑均使用相對路徑（`./data/venues.json`、`./style.css` 等），可在 GitHub Pages 的子目錄下正確運作，無需額外設定。


## 網頁首尾圖片

- `assets/images/site-header-banner.png`：網站最上方主視覺。
- `assets/images/site-footer-reminder.png`：網站最底部的運動提醒圖。


## 第四版更新

- 頁首與頁尾圖片已直接嵌入 `index.html`，即使圖片資料夾未正確上傳也能顯示。
- 已將特色公園試算表中的「園內設施」與「其他設施」寫入 43 筆公園資料。
- 公園卡片不再顯示地址。
- 可運動學校查詢網址已更新為高雄市政府運動發展局提供的頁面。


## 第五版更新

- 已刪除「三民運動園區」。
- 新增「行動健身房巡迴車」分類，共 24 筆巡迴據點。
- 行動健身房據點可依行政區、日期、星期、車別、執行單位及提供局處搜尋。
- 新增「走跑高雄3.0」分類與活動資訊圖，並連結至官方活動網站。
- 走跑高雄3.0會在所有行政區篩選中顯示。
