# 寵物記帳 APP - 專案文件

## 📋 專案概述

這是一個結合「記帳」與「寵物陪伴」的 Web 應用程式。使用者透過記帳與寵物互動，存錢會轉換為虛擬點數，可用於寵物消費。

## 🏗️ 技術架構

### 前端
- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **圖表**: Recharts
- **認證**: NextAuth.js (支援 Google OAuth 和 email 登入)
- **圖像編輯**: Konva.js + react-konva (畫筆工具、背景移除)

### 後端
- **API**: Next.js API Routes
- **ORM**: Prisma
- **資料庫**: SQLite (本地開發)

### 部署建議（未來）
- **前端/後端**: Vercel
- **資料庫**: Supabase / Neon / Railway（生產環境建議使用 PostgreSQL）

## 📁 專案結構

```
wp-final/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── (auth)/            # 認證相關頁面
│   ├── dashboard/         # 主畫面
│   ├── statistics/        # 統計頁面
│   ├── profile/           # 個人資料
│   └── pet/               # 寵物設定
├── components/            # React 元件
│   ├── ui/               # 基礎 UI 元件
│   ├── pet/              # 寵物相關元件
│   └── transaction/      # 記帳相關元件
├── lib/                  # 工具函數
│   ├── prisma.ts         # Prisma 客戶端
│   └── utils.ts          # 通用工具
├── prisma/               # Prisma schema
├── public/               # 靜態資源
└── types/                # TypeScript 類型定義
```

## 🗄️ 資料庫 Schema

### 核心資料表

1. **User** - 使用者
   - id, email, name, image, balance, isInitialized, createdAt
   - balance: 帳戶餘額（與寵物點數不同）
   - isInitialized: 是否完成首次設定

2. **Pet** - 寵物
   - id, userId, name, imageUrl, facingDirection, points, fullness, mood, health, createdAt
   - facingDirection: 寵物朝向（left/right），用於決定移動時的顯示方式

3. **Transaction** - 記帳記錄
   - id, userId, amount, category, type (expense/income/deposit), date, note, createdAt

4. **Category** - 類別（預設 + 自訂）
   - id, userId, name, icon, isDefault, createdAt

5. **PetPurchase** - 寵物購買記錄
   - id, petId, itemId, itemName, category, cost, quantity, purchasedAt

## ✨ 主要功能

### 首次設定
- 新使用者註冊/登入後會進入首次設定頁面
- 設定初始帳戶餘額
- 選擇/上傳寵物照片
- 設定寵物名稱
- 選擇寵物朝向（朝左/朝右）

### 記帳功能
- 支出、收入、存錢記錄
- 自訂類別管理
- 月統計與類別統計

### 寵物系統
- 寵物在房間中自動移動
- 餵食寵物（增加飽足感）
- 撫摸寵物（增加心情值）
- 購買食物、貼紙、配件
- 自訂貼紙與配件
- 寵物狀態顯示（心情、飽足感、健康度）
- **圖像編輯功能**: 上傳寵物圖片或裝飾品時，可使用畫筆工具選擇要保留的區域並裁剪圖片

### 商店系統
- 使用寵物點數購買物品
- 公開/私人自訂貼紙
- 物品庫存管理

## 📝 環境變數設定

### 快速設置

1. **複製範例文件**:
   ```bash
   cp .env.example .env.local
   ```

2. **編輯 `.env.local`** 並填入必要的值

### 環境變數範例

專案根目錄已包含 `.env.example` 文件作為範本。複製並編輯：

```bash
cp .env.example .env.local
```

`.env.local` 文件內容範例：

```env
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (Optional - for Google Sign In)
# If you don't set these, the app will still work with email login
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**完整範例（已填入實際值）**：

```env
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-actual-client-secret"
```

**重要**: 請勿將實際的 `.env.local` 文件提交到 Git（已包含在 `.gitignore` 中）

### 生成 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Google OAuth 設置（可選）

如需使用 Google 登入功能，請按照以下步驟設置：

1. **前往 Google Cloud Console**: https://console.cloud.google.com/
2. **建立新專案**（或選擇現有專案）
3. **啟用 Google+ API 或 People API**
4. **設定 OAuth 同意畫面**
   - 選擇 "External"
   - 填寫應用程式資訊
5. **建立 OAuth 2.0 憑證**
   - 應用程式類型：Web application
   - **授權的 JavaScript 來源**: `http://localhost:3000`
   - **授權的重新導向 URI**: `http://localhost:3000/api/auth/callback/google`
6. **複製 Client ID 和 Client Secret** 到 `.env.local`

詳細步驟請參考 `GOOGLE_AUTH_SETUP.md` 文件。

**注意**: 
- 目前使用 SQLite 資料庫（無需設定 DATABASE_URL）
- 即使未設置 Google OAuth，仍可使用 email 登入（開發模式）

## 🛠️ 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

**注意**: 如果遇到依賴衝突（特別是 `react-konva`），請使用：
```bash
npm install konva "react-konva@^18.2.10" --legacy-peer-deps
```

### 2. 設置環境變數

建立 `.env.local` 檔案並填入必要的環境變數（見上方「環境變數設定」章節）。

### 3. 初始化資料庫

```bash
# 生成 Prisma Client
npx prisma generate

# 執行資料庫遷移
npx prisma migrate dev

# 填充初始資料
npm run db:seed
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 運行。

### 登入方式

- **Email 登入**: 在登入頁面輸入任意 email 即可登入（開發模式，會自動建立使用者）
- **Google 登入**: 如果已設置 Google OAuth，點擊 "Continue with Google" 按鈕即可使用 Google 帳號登入

## 📚 API 路由設計

### 記帳相關
- `GET /api/transactions` - 取得記帳列表
- `POST /api/transactions` - 新增記帳
- `PUT /api/transactions/[id]` - 更新記帳
- `DELETE /api/transactions/[id]` - 刪除記帳

### 寵物相關
- `GET /api/pet` - 取得寵物資訊
- `PUT /api/pet` - 更新寵物資訊
- `POST /api/pet/purchase` - 寵物購買物品
- `POST /api/pet/pet` - 撫摸寵物（增加心情值）

### 首次設定相關
- `GET /api/setup` - 檢查是否已完成首次設定
- `POST /api/setup` - 完成首次設定（設定初始餘額、寵物名稱、照片、朝向）

### 統計相關
- `GET /api/statistics/monthly` - 取得月統計
- `GET /api/statistics/categories` - 取得類別統計

## 🎯 MVP 優先順序

1. **認證系統** - 使用者登入（支援 Google OAuth 和 Email）
2. **記帳功能** - 基本 CRUD
3. **寵物顯示** - 基礎寵物資訊展示
4. **主畫面** - 整合記帳與寵物
5. **統計頁面** - 基本統計展示
6. **圖像編輯** - 畫筆工具、背景移除

## 🎨 圖像編輯功能

應用程式包含強大的圖像編輯功能，讓使用者可以：

- **畫筆工具**: 標記要保留的區域（綠色顯示）
- **橡皮擦工具**: 標記要移除的區域（紅色顯示）
- **可調整畫筆大小**: 5-50px
- **Undo/Clear**: 撤銷或清除所有標記
- **即時預覽**: 在畫布上即時查看編輯效果
- **觸控支援**: 支援手機/平板觸控操作

**使用場景**:
- 上傳寵物圖片時自動打開編輯器
- 上傳自訂貼紙/裝飾品時可選擇編輯
- 編輯後的圖片會自動應用透明背景

**技術實現**: 使用 Konva.js + react-konva 進行圖像處理和 Canvas 操作。

## 📖 相關文件

- **Google 認證設置**: 詳細步驟請參考 `GOOGLE_AUTH_SETUP.md`
- **架構說明**: 請參考 `ARCHITECTURE.md`（如果存在）
- **開發指南**: 請參考 `DEVELOPMENT.md`（如果存在）

## ⚠️ 常見問題

### 1. 依賴安裝失敗

如果遇到 `react-konva` 版本衝突：
```bash
npm install konva "react-konva@^18.2.10" --legacy-peer-deps
```

### 2. Google 登入無法使用

- 確認 `.env.local` 中已設置 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- 確認 Google Cloud Console 中的重定向 URI 正確設置
- 檢查瀏覽器控制台是否有錯誤訊息

### 3. 圖像編輯器無法載入

- 確認已安裝 `konva` 和 `react-konva`
- 檢查瀏覽器控制台是否有錯誤
- 確認圖片格式支援（JPEG, PNG, GIF, WebP）

### 4. 資料庫錯誤

- 執行 `npx prisma generate` 重新生成 Prisma Client
- 執行 `npx prisma migrate dev` 確保資料庫結構最新
- 如果問題持續，嘗試刪除 `prisma/dev.db` 並重新遷移

