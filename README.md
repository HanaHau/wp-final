# (Group 20) 寵物記帳APP

## Demo 影片連結

（暫時空白）

## 專案概述

這是一個結合虛擬寵物養成的記帳 Web 服務，讓使用者在管理收支的同時獲得互動回饋。系統透過每日與每週任務，引導使用者養成持續記帳的習慣。完成任務可獲得點數，累積的點數可用來照顧與培養虛擬寵物，將理財行為轉化為有趣且具動機的體驗。

## Deployed 連結

**生產環境**: [wp-final-phi.vercel.app](https://wp-final-phi.vercel.app)

## Github 連結

**Repository**: [https://github.com/HanaHau/wp-final.git](https://github.com/HanaHau/wp-final.git)

## Demo 影片連結

**Youtube連結**: [https://youtu.be/g-Db5uL71kQ](https://youtu.be/g-Db5uL71kQ)

## 使用/操作方式

#### 首次使用

1. **登入系統**
   - 使用 Google 帳號登入，或
   - 使用 Email 登入

2. **首次設定**
   - 設定唯一的 userID
   - 上傳或選擇寵物照片
   - 設定寵物名稱
   - 選擇寵物朝向（朝左/朝右）

#### 主要功能操作

1. **記帳功能**
   - 點擊首頁的「+」按鈕新增交易
   - 選擇交易類型（收入/支出）
   - 輸入金額、類別、備註
   - 查看交易列表與統計

2. **寵物互動**
   - **撫摸寵物**：點擊寵物增加心情值
   - **餵食寵物**：從商店購買食物後，到 Pet 頁面點擊餵食
   - **裝飾房間**：購買裝飾品拖曳到房間中
   - **裝備配件**：購買配件後，在 Pet 頁面拖曳到寵物身上裝備

3. **商店系統**
   - 使用寵物點數購買食物、裝飾品或配件
   - 創建自訂貼紙（公開或私人）

4. **任務系統**
   - 查看每日任務及每週任務
   - 完成任務後領取點數獎勵

5. **好友系統**
   - 搜尋好友 userID 並發送好友邀請
   - 接受/拒絕好友邀請
   - 訪問好友房間，撫摸和餵食好友寵物
   - 查看好友活動日誌

6. **統計分析**
   - 查看月度收支統計
   - 查看類別分析圖表
   - 查看每日交易明細

## 使用與參考之框架/模組/原始碼

### 核心框架

- **Next.js 14** (App Router) - React 全端框架
- **React 18** - UI 函式庫
- **TypeScript** - 型別安全的 JavaScript

### 後端技術

- **Next.js API Routes** - RESTful API 端點
- **Prisma ORM** - 資料庫 ORM 工具
- **PostgreSQL** (Supabase) - 關聯式資料庫
- **NextAuth.js** - 認證與授權系統

### 前端技術

- **Tailwind CSS** - 實用優先的 CSS 框架
- **Radix UI** - 無障礙 UI 元件庫
- **Framer Motion** - 動畫函式庫
- **SWR** - 資料獲取與快取
- **Zustand** - 輕量級狀態管理

### 圖像處理

- **Konva.js** + **react-konva** - 2D 畫布與圖像編輯
- **@imgly/background-removal** - AI 背景移除

### 其他工具

- **Zod** - Schema 驗證
- **date-fns** - 日期處理
- **Recharts** - 圖表繪製
- **@dnd-kit** - 拖放功能
- **@google/generative-ai** - Gemini AI 整合

## 使用之第三方套件、框架、程式碼

### 核心依賴

```json
{
  "next": "14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5"
}
```

### UI 與樣式

- `tailwindcss` - CSS 框架
- `tailwindcss-animate` - Tailwind 動畫擴充
- `@radix-ui/react-dialog` - 對話框元件
- `@radix-ui/react-dropdown-menu` - 下拉選單元件
- `@radix-ui/react-select` - 選擇器元件
- `@radix-ui/react-slider` - 滑桿元件
- `@radix-ui/react-toast` - Toast 通知元件
- `@radix-ui/react-label` - 標籤元件
- `@radix-ui/react-slot` - Slot 元件
- `lucide-react` - 圖示庫
- `class-variance-authority` - 變體管理
- `clsx` - 條件式 className
- `tailwind-merge` - Tailwind 類別合併

### 資料庫與 ORM

- `@prisma/client` - Prisma Client
- `prisma` - Prisma CLI
- `@next-auth/prisma-adapter` - NextAuth Prisma 適配器

### 認證

- `next-auth` - 認證框架

### 狀態管理與資料獲取

- `zustand` - 狀態管理
- `swr` - 資料獲取與快取

### 動畫與互動

- `framer-motion` - 動畫函式庫
- `@dnd-kit/core` - 拖放核心
- `@dnd-kit/modifiers` - 拖放修飾器
- `@dnd-kit/sortable` - 可排序拖放
- `@dnd-kit/utilities` - 拖放工具函式
- `react-beautiful-dnd` - 拖放元件（備用）

### 圖像處理

- `konva` - 2D 畫布庫
- `react-konva` - React Konva 綁定
- `@imgly/background-removal` - 背景移除

### 圖表與視覺化

- `recharts` - React 圖表庫

### 日期處理

- `date-fns` - 日期工具函式庫
- `react-day-picker` - 日期選擇器

### 驗證

- `zod` - Schema 驗證

### AI 整合

- `@google/generative-ai` - Google Gemini AI

### 開發工具

- `eslint` - 程式碼檢查
- `eslint-config-next` - Next.js ESLint 配置
- `autoprefixer` - CSS 自動前綴
- `postcss` - CSS 處理器
- `tsx` - TypeScript 執行器

## 專題製作心得

### 花紫晏
在製作期末專案的過程中，我深刻感受到這次與以往個人作業的不同。透過與組員之間的討論與分工，總能激發出許多有趣且實用的想法，也讓這個 web app 在反覆調整中逐漸成形，最終成為學期初所構想的平台樣貌。從最初的發想到實際實作與整合，每個階段都需要持續溝通與協調，也讓我更體會到團隊溝通在專案開發中的重要性。非常感謝組員們在整個專案期間的投入，才能讓本次期末專案順利完成。

### 潘芊寧
這次期末專題在一開始其實進行得並不順利。雖然腦中有不少想法，但真正動手實作之後，卻發現成果常常和原本的想像有一段落差，特別是在前端設計上，我們經歷了多次大幅修改，才逐漸做出一個大家都能接受的版本。我認為這也是小組專題中最困難的地方。每個人心中對作品的想像可能都不一樣，只有在實際做出來之後，才會知道這個方向是否符合大家的期待，甚至能不能達到讓大部分使用者都滿意的程度。很幸運的是，這次的組員都非常投入，也願意主動分享自己的想法與意見，大家一起不斷討論、調整，才一步步完成現在的成品。真的非常感謝他們！沒有他們的努力與合作，就不會有今天的成果。


## 如何在 localhost 安裝與測試之詳細步驟

### 前置需求

確保您的系統已安裝以下軟體：

- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本
- **Git**: 用於版本控制

檢查版本：

```bash
node --version  # 應顯示 v18.0.0 或更高
npm --version   # 應顯示 9.0.0 或更高
```

### 步驟 1: 複製專案

```bash
git clone https://github.com/HanaHau/wp-final.git
cd wp-final
```

### 步驟 2: 安裝依賴

```bash
npm install
```

**注意**: 如果遇到依賴衝突（特別是 `react-konva`），請使用：

```bash
npm install konva "react-konva@^18.2.10" --legacy-peer-deps
```

### 步驟 3: 設置環境變數

複製環境變數範例檔案：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入您的實際環境變數值：

```env
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Database Configuration (Supabase)
# 使用 Session Pooler (端口 6543) 用於應用程式連接
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20"

# 使用直接連接 (端口 5432) 用於 Prisma 遷移
DIRECT_URL="postgresql://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Google OAuth (Optional - 如果不需要 Google 登入可以省略)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Gemini AI API (Optional - 如果不需要 AI 聊天功能可以省略)
GEMINI_API_KEY="your-gemini-api-key"
```

#### 重要說明

1. **生成 NEXTAUTH_SECRET**：
   ```bash
   openssl rand -base64 32
   ```
   將生成的密鑰複製到 `.env.local` 的 `NEXTAUTH_SECRET` 欄位。

2. **資料庫連接說明**：
   - `DATABASE_URL`: 用於應用程式運行時的資料庫連接，使用 Supabase Session Pooler（端口 6543）
   - `DIRECT_URL`: 用於 Prisma 遷移操作，使用直接連接（端口 5432）
   - 兩個 URL 都需要從 Supabase Dashboard 獲取
   - 請將 `postgres.xxx:password` 和 `aws-1-ap-southeast-1.pooler.supabase.com` 替換為您的實際 Supabase 連接資訊

3. **獲取 Supabase 連接資訊**：
   - 登入 [Supabase Dashboard](https://app.supabase.com/)
   - 選擇您的專案
   - 前往 **Settings** > **Database**
   - 複製 **Connection string** 下的連接字串
   - **Session mode** (端口 6543) → 用於 `DATABASE_URL`
   - **Direct connection** (端口 5432) → 用於 `DIRECT_URL`

### 步驟 4: 初始化資料庫

#### 4.1 生成 Prisma Client

```bash
npm run db:generate
# 或
npx prisma generate
```

#### 4.2 執行資料庫遷移

```bash
npm run db:migrate
# 或
npx prisma migrate dev
```

**注意**: 如果遇到 `prepared statement "s0" does not exist` 錯誤，請確認：
- `DIRECT_URL` 使用端口 5432（直接連接）
- `DIRECT_URL` 不包含 `pgbouncer=true` 參數

#### 4.3 填充初始資料（可選）

```bash
npm run db:seed
```

### 步驟 5: 啟動開發伺服器

```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 運行。

### 步驟 6: 測試應用程式

1. **登入測試**
   - 打開瀏覽器訪問 `http://localhost:3000`
   - 使用 Email 登入（開發模式，輸入任意 email 即可）
   - 或使用 Google 登入（需設置 OAuth）

2. **功能測試**
   - 完成首次設定（設定 userID、上傳寵物照片、設定寵物名稱）
   - 新增記帳記錄
   - 與寵物互動（撫摸、餵食）
   - 購買商店物品
   - 查看統計頁面
   - 測試好友功能（需要兩個帳號）

### 步驟 7: 使用 Prisma Studio 查看資料庫（可選）

```bash
npm run db:studio
```

這會開啟一個網頁介面（通常是 `http://localhost:5555`），您可以在其中：
- 查看所有資料表
- 新增、編輯、刪除記錄
- 查看關聯資料

### 常見問題排除

#### 1. 依賴安裝失敗

**問題**: 安裝時出現 `react-konva` 版本衝突錯誤

**解決方案**:
```bash
npm install konva "react-konva@^18.2.10" --legacy-peer-deps
```

#### 2. Prisma Client 未生成

**問題**: 執行時出現 `@prisma/client did not initialize yet` 錯誤

**解決方案**:
```bash
npx prisma generate
```

#### 3. 資料庫遷移失敗

**問題**: 執行 `npx prisma migrate dev` 時出現 `prepared statement "s0" does not exist` 錯誤

**解決方案**:
1. 確認 `.env.local` 中的 `DIRECT_URL` 使用端口 5432（直接連接）
2. 確認 `DIRECT_URL` 不包含 `pgbouncer=true` 參數
3. 確認 `DIRECT_URL` 格式正確：
   ```
   DIRECT_URL="postgresql://postgres.xxx:password@host:5432/postgres?sslmode=require"
   ```

#### 4. 連接池超時錯誤

**問題**: 出現 `Unable to check out process from the pool due to timeout` 錯誤

**解決方案**:
1. 確認 `DATABASE_URL` 使用端口 6543（Session Pooler）
2. 確認 `DATABASE_URL` 包含 `pgbouncer=true` 參數
3. 確認 `DATABASE_URL` 包含連接池參數：
   ```
   DATABASE_URL="...?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20"
   ```
4. 重啟開發伺服器
5. 如果問題持續，清理 `.next` 緩存：
   ```bash
   rm -rf .next
   npx prisma generate
   ```

#### 5. Google 登入無法使用

**問題**: 點擊 Google 登入按鈕沒有反應或出現錯誤

**解決方案**:
1. 確認 `.env.local` 中已設置 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
2. 確認 Google Cloud Console 中的重定向 URI 正確設置為 `http://localhost:3000/api/auth/callback/google`
3. 確認 OAuth 同意畫面已設定完成
4. 檢查瀏覽器控制台是否有錯誤訊息
5. 重新啟動開發伺服器

#### 6. 環境變數未生效

**問題**: 修改 `.env.local` 後變更未生效

**解決方案**:
1. 確認檔案名稱是 `.env.local`（不是 `.env`）
2. 重新啟動開發伺服器（環境變數只在啟動時讀取）
3. 確認變數名稱正確（大小寫敏感）
4. 確認沒有語法錯誤（例如缺少引號）

#### 7. 端口已被佔用

**問題**: 啟動時出現 `Port 3000 is already in use` 錯誤

**解決方案**:
```bash
# 方法 1: 終止佔用端口的程序
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 方法 2: 使用其他端口
PORT=3001 npm run dev
```

## 每位組員之負責項目

### 工作分配總覽

| 組員 | 主要模組 | 核心功能 |
|------|---------|---------|
| **潘芊寧** | 記帳與統計模組 | 記帳功能、類別管理、統計分析 |
| **花紫晏** | 寵物核心系統 | 寵物狀態、互動系統、商店、圖片編輯 |
| **陳奕蓁** | 社交與任務系統 | 好友系統、任務系統、AI 聊天、認證 |

---

### 潘芊寧：記帳與統計模組

| 項目類別 | 負責內容 |
|---------|---------|
| **主要功能** | • 記帳功能開發（交易記錄 CRUD、交易類型管理、日期與備註、列表分頁）<br>• 類別管理系統（自訂類別 CRUD、排序、emoji 圖示、預設/使用者類別區分）<br>• 統計分析頁面（月度收支統計、類別分析圖表、每日交易明細、日期範圍篩選） |
| **API 開發** | • `/api/transactions` - 交易 CRUD API<br>• `/api/categories` - 類別管理 API<br>• `/api/statistics/monthly` - 月度統計 API<br>• `/api/statistics/categories` - 類別統計 API |
| **前端元件** | • `TransactionDialog` - 交易對話框元件<br>• `TransactionsContent` - 交易列表頁面<br>• `StatisticsContent` - 統計分析頁面<br>• `CategorySelector` - 類別選擇器元件 |
| **整合與優化** | • 記帳功能與寵物系統整合（記帳影響寵物狀態）<br>• 記帳功能與任務系統整合（記帳任務追蹤）<br>• 優化交易列表載入效能<br>• 實作樂觀更新（Optimistic Updates）提升使用者體驗<br>• 交易資料驗證與錯誤處理 |

---

### 花紫晏：寵物核心系統

| 項目類別 | 負責內容 |
|---------|---------|
| **主要功能** | • 寵物狀態管理（狀態數值管理、自動衰減機制、上下限控制、死亡機制）<br>• 寵物互動系統（撫摸、餵食、動畫反饋、回應訊息）<br>• 房間裝飾系統（背景佈局、貼紙拖放、裝飾品管理、配件裝備）<br>• 商店系統（商品展示、點數購買、庫存管理、自訂貼紙、公開/私人分享）<br>• 圖片編輯功能（圖片上傳、畫筆/橡皮擦工具、AI 背景移除、預覽編輯） |
| **API 開發** | • `/api/pet` - 寵物資訊 API<br>• `/api/pet/pet` - 撫摸寵物 API<br>• `/api/pet/feed` - 餵食寵物 API<br>• `/api/pet/purchase` - 購買物品 API<br>• `/api/pet/stickers` - 貼紙管理 API<br>• `/api/pet/accessories` - 配件管理 API<br>• `/api/pet/upload` - 圖片上傳 API<br>• `/api/custom-stickers` - 自訂貼紙 API |
| **前端元件** | • `Room` - 寵物房間主元件<br>• `PetRoomContent` - 寵物房間內容元件<br>• `PetDisplay` - 寵物顯示元件<br>• `FeedPanel` - 餵食面板元件<br>• `DecorPanel` - 裝飾面板元件<br>• `ShopContent` - 商店頁面元件<br>• `ImageEditor` - 圖片編輯器元件 |
| **整合與優化** | • 寵物系統與記帳系統整合（記帳影響寵物狀態）<br>• 寵物系統與任務系統整合（寵物互動任務）<br>• 優化寵物動畫與互動流暢度<br>• 實作樂觀更新提升互動即時性<br>• 圖片上傳與處理效能優化 |

---

### 陳奕蓁：社交與任務系統

| 項目類別 | 負責內容 |
|---------|---------|
| **主要功能** | • 好友系統（搜尋、邀請發送/接收、接受/拒絕、列表管理、訪問房間、互動、活動日誌）<br>• 任務系統（每日/每週任務設計、進度追蹤、獎勵發放、通知系統）<br>• AI 聊天功能（Gemini API 整合、對話介面、歷史記錄、上下文管理）<br>• 使用者設定與個人資料（個人資料頁面、名稱/ID 修改、頭像上傳、首次設定）<br>• 認證系統（NextAuth.js 整合、Google OAuth、Email 登入、Session 管理）<br>• 首頁 Dashboard（頁面佈局、寵物房間顯示、餘額顯示、快速記帳、導航選單） |
| **API 開發** | • `/api/friends` - 好友管理 API<br>• `/api/friends/search` - 好友搜尋 API<br>• `/api/friends/invitations` - 好友邀請 API<br>• `/api/friends/[friendId]/pet` - 好友寵物互動 API<br>• `/api/missions` - 任務管理 API<br>• `/api/missions/claim` - 任務獎勵領取 API<br>• `/api/chat` - AI 聊天 API<br>• `/api/user` - 使用者資訊 API<br>• `/api/setup` - 首次設定 API<br>• `/api/dashboard/summary` - Dashboard 資料 API |
| **前端元件** | • `FriendsContent` - 好友頁面元件<br>• `FriendRoom` - 好友房間元件<br>• `AddFriendDialog` - 新增好友對話框<br>• `InvitationDialog` - 邀請管理對話框<br>• `MissionsPanel` - 任務面板元件<br>• `MissionNotification` - 任務通知元件<br>• `ChatInput` - 聊天輸入元件<br>• `PetChatBubble` - 寵物對話泡泡元件<br>• `ProfileContent` - 個人資料頁面元件<br>• `DashboardContent` - Dashboard 內容元件 |
| **整合與優化** | • 好友系統與任務系統整合（好友互動任務）<br>• 任務系統與記帳系統整合（記帳任務）<br>• 任務系統與寵物系統整合（寵物互動任務）<br>• 優化好友房間載入效能<br>• 實作即時通知系統（Toast 通知）<br>• 優化 Dashboard 資料載入速度<br>• 整體 UI/UX 優化與響應式設計 |

## 對於此課程的建議

（暫時空白）