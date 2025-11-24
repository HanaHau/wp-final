# 開發指南

## 🚀 快速開始

### 1. 環境準備

確保你的環境已安裝：
- Node.js 18+ 
- npm 或 yarn

**注意**: 目前使用 SQLite 資料庫，無需額外安裝資料庫服務

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製 `.env.example` 並建立 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入以下資訊：

```env
# NextAuth 設定
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # 可使用: openssl rand -base64 32
```

**注意**: 
- 目前使用 SQLite 資料庫，無需設定 DATABASE_URL
- 認證使用簡化的 email 登入（開發模式），輸入任意 email 即可登入

### 4. 初始化資料庫

```bash
# 產生 Prisma Client
npm run db:generate

# 執行資料庫遷移（會建立 prisma/dev.db 檔案）
npm run db:migrate

# （可選）開啟 Prisma Studio 查看資料庫
npm run db:studio
```

**注意**: SQLite 資料庫檔案會建立在 `prisma/dev.db`

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

**登入**: 在登入頁面輸入任意 email（例如：test@example.com）即可登入

## 📁 專案結構說明

```
wp-final/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── auth/                 # NextAuth 認證
│   │   ├── transactions/         # 記帳 CRUD
│   │   ├── pet/                  # 寵物相關 API
│   │   └── statistics/           # 統計 API
│   ├── (auth)/                   # 認證相關頁面
│   ├── dashboard/                # 主畫面
│   ├── statistics/               # 統計頁面
│   ├── pet/                      # 寵物設定頁面
│   ├── layout.tsx                # 根 Layout
│   └── page.tsx                  # 首頁（重導向到 dashboard）
│
├── components/                   # React 元件
│   ├── ui/                       # 基礎 UI 元件（shadcn/ui）
│   ├── dashboard/                # 主畫面相關元件
│   ├── pet/                      # 寵物相關元件
│   ├── transaction/              # 記帳相關元件
│   ├── statistics/               # 統計相關元件
│   └── providers/                # Context Providers
│
├── lib/                          # 工具函數
│   ├── prisma.ts                 # Prisma 客戶端
│   ├── auth.ts                   # 認證輔助函數
│   └── utils.ts                  # 通用工具函數
│
├── prisma/                       # Prisma 設定
│   └── schema.prisma             # 資料庫 Schema
│
└── types/                        # TypeScript 類型定義
```

## 🗄️ 資料庫 Schema 說明

### User（使用者）
- 由 NextAuth 自動管理
- 與 Pet、Transaction、Category 一對多關聯

### Pet（寵物）
- `points`: 虛擬點數（存款時增加）
- `fullness`: 飽足感 0-100
- `mood`: 心情值 0-100
- `health`: 健康度 0-100

### Transaction（記帳記錄）
- `type`: EXPENSE（支出）/ INCOME（收入）/ DEPOSIT（存款）
- `amount`: 金額
- `category`: 類別名稱
- `date`: 記帳日期

### Category（類別）
- `isDefault`: 是否為預設類別
- 支援使用者自訂類別

### PetPurchase（寵物購買記錄）
- 記錄寵物用點數購買的物品

## 🔌 API 端點說明

### 記帳相關

- `GET /api/transactions` - 取得記帳列表
  - Query: `startDate`, `endDate`, `type`
- `POST /api/transactions` - 新增記帳
  - Body: `{ amount, category, type, date?, note? }`
- `PUT /api/transactions/[id]` - 更新記帳
- `DELETE /api/transactions/[id]` - 刪除記帳

### 寵物相關

- `GET /api/pet` - 取得寵物資訊（若不存在會自動建立）
- `PUT /api/pet` - 更新寵物資訊
  - Body: `{ name?, imageUrl? }`
- `POST /api/pet/purchase` - 寵物購買物品
  - Body: `{ itemId, quantity }`

### 統計相關

- `GET /api/statistics/monthly` - 取得月統計
  - Query: `year`, `month`
- `GET /api/statistics/categories` - 取得類別統計
  - Query: `year`, `month`, `type`

## 🎯 MVP 功能清單

### ✅ 已完成

- [x] 專案基礎架構
- [x] 資料庫 Schema 設計
- [x] NextAuth 認證系統（Google OAuth）
- [x] 記帳 CRUD API
- [x] 寵物系統 API
- [x] 統計 API
- [x] 登入頁面
- [x] 主畫面（Dashboard）
- [x] 記帳對話框
- [x] 寵物顯示元件
- [x] 統計頁面
- [x] 寵物設定頁面

### ⏳ 待實作功能

- [ ] 圖片上傳功能（寵物照片）
- [ ] 類別管理（新增/編輯/刪除自訂類別）
- [ ] 記帳記錄列表頁面
- [ ] 記帳編輯/刪除功能
- [ ] 寵物回應訊息系統
- [ ] 每日打卡功能
- [ ] 月曆視圖優化
- [ ] 響應式設計優化

## 🛠️ 開發建議

### 資料庫操作

使用 Prisma Studio 查看和編輯資料：

```bash
npm run db:studio
```

### 新增資料庫欄位

1. 編輯 `prisma/schema.prisma`
2. 執行遷移：`npm run db:migrate`
3. 重新產生 Prisma Client：`npm run db:generate`

### 新增 API 路由

在 `app/api/` 下建立新的路由檔案，參考現有路由的結構。

### 新增頁面

在 `app/` 下建立新的資料夾和 `page.tsx` 檔案。

## 🐛 常見問題

### 1. Prisma 遷移失敗

- 確認 `prisma/dev.db` 檔案權限正確
- 檢查是否有未完成的遷移
- 嘗試重置：`npx prisma migrate reset`（會清除所有資料）
- 如果問題持續，可刪除 `prisma/dev.db` 和 `prisma/migrations` 資料夾後重新執行遷移

## 📚 技術文件參考

- [Next.js 14 文件](https://nextjs.org/docs)
- [Prisma 文件](https://www.prisma.io/docs)
- [NextAuth.js 文件](https://next-auth.js.org/)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [shadcn/ui 文件](https://ui.shadcn.com/)

## 🚢 部署建議

### Vercel 部署

1. 將專案推送到 GitHub
2. 在 Vercel 匯入專案
3. 設定環境變數
4. 設定資料庫（建議使用 Supabase 或 Neon）

### 資料庫選擇

- **Supabase**: 免費 PostgreSQL，適合 MVP
- **Neon**: Serverless PostgreSQL
- **Railway**: 簡單的 PostgreSQL 託管

### 環境變數設定

在 Vercel 專案設定中新增：
- `DATABASE_URL`
- `NEXTAUTH_URL`（生產環境 URL）
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

記得更新 Google OAuth 的授權重新導向 URI 為生產環境 URL。

