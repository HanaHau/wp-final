# 寵物記帳 APP - 專案文件

## 📋 專案概述

這是一個結合「記帳」與「寵物陪伴」的 Web 應用程式。使用者透過記帳與寵物互動，記帳會影響寵物狀態，可用於寵物消費。

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
- **資料庫**: PostgreSQL (Supabase)

### 部署
- **前端/後端**: Vercel
- **資料庫**: Supabase

## 📦 系統需求

在開始之前，請確保您的系統已安裝以下軟體：

- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本（或使用 yarn/pnpm）
- **Git**: 用於版本控制

### 檢查版本

```bash
node --version  # 應顯示 v18.0.0 或更高
npm --version   # 應顯示 9.0.0 或更高
```

## 🚀 本地開發設置指南

### 步驟 1: 複製專案

```bash
git clone <repository-url>
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

在專案根目錄建立 `.env.local` 檔案：

```bash
touch .env.local
```

編輯 `.env.local` 並填入以下內容：

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

**重要**: 
- `.env.local` 檔案已包含在 `.gitignore` 中，不會被提交到 Git
- 即使未設置 Google OAuth，應用程式仍可使用 email 登入（開發模式）

### 步驟 4: 初始化資料庫

#### 4.1 生成 Prisma Client

```bash
npm run db:generate
# 或
npx prisma generate
```

這個命令會根據 `prisma/schema.prisma` 生成 Prisma Client，讓您可以在應用程式中使用資料庫操作。

#### 4.2 執行資料庫遷移

```bash
npm run db:migrate
# 或
npx prisma migrate dev
```

這個命令會：
- 連接到資料庫（使用 `DIRECT_URL`）
- 執行所有遷移檔案，建立資料表結構
- 如果這是第一次執行，會建立初始遷移

**注意**: 如果遇到 `prepared statement "s0" does not exist` 錯誤，請確認：
- `DIRECT_URL` 使用端口 5432（直接連接）
- `DIRECT_URL` 不包含 `pgbouncer=true` 參數

#### 4.3 填充初始資料（可選）

```bash
npm run db:seed
```

這個命令會執行 `prisma/seed.ts`，建立：
- 記帳類型（支出、收入）
- 預設類別（如果有的話）

**預期輸出**：
```
🌱 Seeding database...
Creating types...
✅ Seeding completed!
```

### 步驟 5: 啟動開發伺服器

```bash
npm run dev
```

應用程式將在 `http://localhost:3000` 運行。

打開瀏覽器訪問 `http://localhost:3000`，您應該會看到登入頁面。

### 步驟 6: 登入應用程式

#### Email 登入（開發模式）

1. 在登入頁面輸入任意 email（例如：`test@example.com`）
2. 點擊登入
3. 系統會自動建立使用者帳號（如果不存在）

#### Google 登入（需要設置 OAuth）

如果您已設置 Google OAuth（見下方「Google OAuth 設置」章節），可以點擊 "Continue with Google" 按鈕使用 Google 帳號登入。

## 🔐 Google OAuth 設置（可選）

如需使用 Google 登入功能，請按照以下步驟設置：

### 1. 前往 Google Cloud Console

訪問 https://console.cloud.google.com/

### 2. 建立新專案

- 點擊頂部專案選擇器
- 點擊「新增專案」
- 輸入專案名稱（例如：`pet-accounting-app`）
- 點擊「建立」

### 3. 啟用 API

- 在左側選單選擇「API 和服務」>「程式庫」
- 搜尋並啟用「Google+ API」或「People API」

### 4. 設定 OAuth 同意畫面

- 在左側選單選擇「API 和服務」>「OAuth 同意畫面」
- 選擇「外部」（External）
- 填寫應用程式資訊：
  - 應用程式名稱
  - 使用者支援電子郵件
  - 開發人員連絡資訊
- 點擊「儲存並繼續」
- 在「範圍」頁面直接點擊「儲存並繼續」
- 在「測試使用者」頁面可以添加測試帳號（可選）
- 點擊「返回資訊主頁」

### 5. 建立 OAuth 2.0 憑證

- 在左側選單選擇「API 和服務」>「憑證」
- 點擊「建立憑證」>「OAuth 用戶端 ID」
- 選擇應用程式類型：「網頁應用程式」
- 輸入名稱（例如：`Pet Accounting App`）
- **授權的 JavaScript 來源**：
  ```
  http://localhost:3000
  ```
- **授權的重新導向 URI**：
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- 點擊「建立」

### 6. 複製憑證資訊

- 複製「用戶端 ID」和「用戶端密鑰」
- 將它們填入 `.env.local`：
  ```env
  GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET="your-client-secret"
  ```

### 7. 重新啟動開發伺服器

```bash
# 停止目前的伺服器（Ctrl+C）
npm run dev
```

詳細步驟請參考 `GOOGLE_AUTH_SETUP.md` 文件。

## 📁 專案結構

```
wp-final/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/         # 認證相關 API
│   │   ├── pet/          # 寵物相關 API
│   │   ├── transactions/ # 記帳相關 API
│   │   ├── categories/   # 類別相關 API
│   │   └── statistics/  # 統計相關 API
│   ├── (auth)/           # 認證相關頁面
│   ├── dashboard/        # 主畫面
│   ├── statistics/       # 統計頁面
│   ├── profile/          # 個人資料
│   └── pet/              # 寵物設定
├── components/           # React 元件
│   ├── ui/              # 基礎 UI 元件（Button, Dialog 等）
│   ├── pet/             # 寵物相關元件
│   ├── transaction/     # 記帳相關元件
│   ├── dashboard/       # 主畫面元件
│   └── statistics/      # 統計元件
├── lib/                 # 工具函數
│   ├── prisma.ts        # Prisma 客戶端
│   ├── auth.ts          # 認證工具
│   ├── auth-options.ts  # NextAuth 配置
│   └── utils.ts         # 通用工具
├── prisma/              # Prisma 相關檔案
│   ├── schema.prisma    # 資料庫 Schema
│   ├── seed.ts          # 資料庫種子檔案
│   └── migrations/      # 資料庫遷移檔案
├── public/             # 靜態資源
│   ├── cat.png         # 預設寵物圖片
│   └── ...
├── types/              # TypeScript 類型定義
└── data/              # 靜態資料（商店物品等）
```

## ✨ 主要功能

### 首次設定
- 新使用者註冊/登入後會進入首次設定頁面
- 設定 userID（必須唯一）
- 選擇/上傳寵物照片
- 設定寵物名稱
- 選擇寵物朝向（朝左/朝右）

### 記帳功能
- 支出、收入記錄
- 自訂類別管理
- 月統計與類別統計
- 首頁顯示當月總收入減總支出

### 寵物系統
- 寵物在房間中自動移動
- 餵食寵物（增加飽足感，上限 100）
- 撫摸寵物（增加心情值，上限 100）
- 購買食物、貼紙、裝飾品
- 自訂貼紙與裝飾品
- 寵物狀態顯示（心情、飽足感）
- 連續登入 5 天獎勵（+20 點數）
- 寵物死亡機制（mood 或 fullness 為 0 時顯示死亡覆蓋層）

### 商店系統
- 使用寵物點數購買物品
- 公開/私人自訂貼紙
- 物品庫存管理
- 物品價格分類（一般、高級、精品）

### 圖像編輯功能
- **畫筆工具**: 標記要保留的區域（綠色顯示）
- **橡皮擦工具**: 標記要移除的區域（紅色顯示）
- **可調整畫筆大小**: 5-50px
- **Undo/Clear**: 撤銷或清除所有標記
- **即時預覽**: 在畫布上即時查看編輯效果
- **觸控支援**: 支援手機/平板觸控操作

## 📝 可用指令

### 開發相關

```bash
# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# 啟動生產伺服器
npm start

# 執行 ESLint
npm run lint
```

### 資料庫相關

```bash
# 生成 Prisma Client
npm run db:generate
# 或
npx prisma generate

# 執行資料庫遷移（開發環境）
npm run db:migrate
# 或
npx prisma migrate dev

# 執行資料庫遷移（生產環境）
npm run db:migrate:deploy
# 或
npx prisma migrate deploy

# 開啟 Prisma Studio（資料庫視覺化管理工具）
npm run db:studio
# 或
npx prisma studio

# 填充初始資料
npm run db:seed
```

### Prisma Studio

Prisma Studio 是一個視覺化的資料庫管理工具，可以讓您查看和編輯資料庫內容：

```bash
npx prisma studio
```

這會開啟一個網頁介面（通常是 `http://localhost:5555`），您可以在其中：
- 查看所有資料表
- 新增、編輯、刪除記錄
- 查看關聯資料

## ⚠️ 常見問題

### 1. 依賴安裝失敗

**問題**: 安裝時出現 `react-konva` 版本衝突錯誤

**解決方案**:
```bash
npm install konva "react-konva@^18.2.10" --legacy-peer-deps
```

### 2. Prisma Client 未生成

**問題**: 執行時出現 `@prisma/client did not initialize yet` 錯誤

**解決方案**:
```bash
npx prisma generate
```

### 3. 資料庫遷移失敗

**問題**: 執行 `npx prisma migrate dev` 時出現 `prepared statement "s0" does not exist` 錯誤

**解決方案**:
1. 確認 `.env.local` 中的 `DIRECT_URL` 使用端口 5432（直接連接）
2. 確認 `DIRECT_URL` 不包含 `pgbouncer=true` 參數
3. 確認 `DIRECT_URL` 格式正確：
   ```
   DIRECT_URL="postgresql://postgres.xxx:password@host:5432/postgres?sslmode=require"
   ```

### 4. 連接池超時錯誤

**問題**: 出現 `Unable to check out process from the pool due to timeout` 或 `Timed out fetching a new connection from the connection pool` 錯誤

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

### 5. Google 登入無法使用

**問題**: 點擊 Google 登入按鈕沒有反應或出現錯誤

**解決方案**:
1. 確認 `.env.local` 中已設置 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
2. 確認 Google Cloud Console 中的重定向 URI 正確設置為 `http://localhost:3000/api/auth/callback/google`
3. 確認 OAuth 同意畫面已設定完成
4. 檢查瀏覽器控制台是否有錯誤訊息
5. 重新啟動開發伺服器

### 6. 環境變數未生效

**問題**: 修改 `.env.local` 後變更未生效

**解決方案**:
1. 確認檔案名稱是 `.env.local`（不是 `.env`）
2. 重新啟動開發伺服器（環境變數只在啟動時讀取）
3. 確認變數名稱正確（大小寫敏感）
4. 確認沒有語法錯誤（例如缺少引號）

### 7. 端口已被佔用

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

### 8. 資料庫連接失敗

**問題**: 出現 `Can't reach database server` 錯誤

**解決方案**:
1. 確認 Supabase 專案正在運行
2. 確認 `.env.local` 中的 `DATABASE_URL` 和 `DIRECT_URL` 正確
3. 確認網路連接正常
4. 檢查 Supabase Dashboard 中的連接資訊是否正確
5. 確認 IP 地址未被 Supabase 防火牆阻擋

## 🔧 開發建議

### 使用 Prisma Studio 查看資料

在開發過程中，建議開啟 Prisma Studio 來查看資料庫狀態：

```bash
npx prisma studio
```

這會開啟一個網頁介面，讓您可以直接查看和編輯資料庫內容。

### 重置資料庫

如果需要重置資料庫到初始狀態：

```bash
# 警告：這會刪除所有資料！
# 1. 在 Supabase Dashboard 中重置資料庫，或
# 2. 手動刪除所有資料表

# 重新執行遷移
npx prisma migrate dev

# 重新填充資料
npm run db:seed
```

### 查看資料庫結構變更

在修改 `prisma/schema.prisma` 後：

```bash
# 1. 生成 Prisma Client
npx prisma generate

# 2. 建立遷移
npx prisma migrate dev --name your_migration_name

# 3. 如果只是開發測試，也可以使用（不建立遷移檔案）
npx prisma db push
```

### 連接池管理

為了避免連接池超時問題：

1. **確保使用單例模式**: Prisma Client 應該在 `lib/prisma.ts` 中作為單例使用
2. **正確設置連接參數**: `DATABASE_URL` 應包含 `pgbouncer=true` 和適當的連接池參數
3. **避免長時間持有連接**: 確保 API 路由快速完成並釋放連接
4. **監控連接數**: 在 Supabase Dashboard 中監控連接數使用情況

## 📚 API 路由設計

### 認證相關
- `GET /api/auth/signin` - 登入頁面
- `POST /api/auth/callback/[provider]` - OAuth 回調

### 記帳相關
- `GET /api/transactions` - 取得記帳列表
- `POST /api/transactions` - 新增記帳
- `PUT /api/transactions/[id]` - 更新記帳
- `DELETE /api/transactions/[id]` - 刪除記帳

### 類別相關
- `GET /api/categories` - 取得類別列表
- `POST /api/categories` - 新增類別
- `PUT /api/categories/[id]` - 更新類別
- `DELETE /api/categories/[id]` - 刪除類別

### 寵物相關
- `GET /api/pet` - 取得寵物資訊（包含每日重置邏輯）
- `PUT /api/pet` - 更新寵物資訊
- `POST /api/pet/purchase` - 寵物購買物品
- `POST /api/pet/pet` - 撫摸寵物（增加心情值）
- `POST /api/pet/feed` - 餵食寵物（增加飽足感）
- `POST /api/pet/restart` - 重新開始遊戲（重置寵物狀態）

### 首次設定相關
- `GET /api/setup` - 檢查是否已完成首次設定
- `POST /api/setup` - 完成首次設定

### 統計相關
- `GET /api/statistics/monthly` - 取得月統計
- `GET /api/statistics/categories` - 取得類別統計

## 📖 相關文件

- **Google 認證設置**: 詳細步驟請參考 `GOOGLE_AUTH_SETUP.md`
- **架構說明**: 請參考 `ARCHITECTURE.md`
- **開發指南**: 請參考 `DEVELOPMENT.md`

## 📄 授權

此專案為私人專案。

## 🤝 貢獻

目前不接受外部貢獻。

---

**祝您開發愉快！** 🎉
