# 架構設計文件

## 📐 整體架構

### 技術棧選擇

**前端框架**: Next.js 14 (App Router)
- ✅ Server Components 與 Client Components 分離
- ✅ 內建 API Routes（全端框架）
- ✅ 優異的 SEO 與效能
- ✅ 簡化部署流程

**後端**: Next.js API Routes
- ✅ 與前端同一個專案，簡化開發
- ✅ TypeScript 類型安全
- ✅ 自動 API 路由生成

**資料庫**: PostgreSQL + Prisma ORM
- ✅ 關聯式資料庫，適合複雜查詢
- ✅ Prisma 提供類型安全的資料庫操作
- ✅ 自動產生 TypeScript 類型

**認證**: NextAuth.js
- ✅ 支援多種 OAuth 提供者
- ✅ Session 管理
- ✅ 與 Prisma 整合

**UI 框架**: Tailwind CSS + shadcn/ui
- ✅ 快速開發
- ✅ 響應式設計
- ✅ 可自訂元件

## 🗄️ 資料庫設計

### Entity Relationship Diagram

```
User (1) ──< (1) Pet
  │
  ├──< (N) Transaction
  │
  └──< (N) Category

Pet (1) ──< (N) PetPurchase
```

### 核心資料表

#### User
- 由 NextAuth 自動管理
- 儲存 Google OAuth 資訊

#### Pet
- 每個使用者對應一隻寵物（1:1）
- 虛擬點數系統（存款轉換）
- 狀態數值：飽足感、心情值、健康度

#### Transaction
- 記帳記錄（支出/收入/存款）
- 支援類別分類
- 日期時間索引優化查詢

#### Category
- 預設類別 + 使用者自訂類別
- 支援 emoji 圖示

#### PetPurchase
- 寵物購買記錄
- 記錄點數消費

## 🔌 API 設計原則

### RESTful 風格

- `GET /api/resource` - 列表查詢
- `GET /api/resource/[id]` - 單一資源
- `POST /api/resource` - 建立資源
- `PUT /api/resource/[id]` - 更新資源
- `DELETE /api/resource/[id]` - 刪除資源

### 認證機制

所有 API 都需要透過 NextAuth Session 認證：
```typescript
const user = await getCurrentUser()
if (!user) {
  return NextResponse.json({ error: '未授權' }, { status: 401 })
}
```

### 錯誤處理

統一錯誤回應格式：
```typescript
{
  error: "錯誤訊息",
  details?: any // 可選的詳細資訊
}
```

## 🎨 前端架構

### 元件層級結構

```
app/
  ├── layout.tsx (根 Layout，包含 SessionProvider)
  ├── page.tsx (首頁重導向)
  └── [route]/
      └── page.tsx (頁面元件，Server Component)

components/
  ├── ui/ (基礎 UI 元件)
  ├── dashboard/ (主畫面元件)
  ├── pet/ (寵物相關元件)
  ├── transaction/ (記帳相關元件)
  └── statistics/ (統計相關元件)
```

### 狀態管理

- **Server State**: 使用 Server Components 直接從資料庫取得
- **Client State**: 使用 React useState/useEffect
- **Global State**: 可選用 Zustand（目前未使用）

### 資料流

1. **頁面載入**: Server Component 取得資料
2. **使用者互動**: Client Component 呼叫 API
3. **資料更新**: API 更新資料庫，前端重新取得資料

## 🐾 寵物系統設計

### 點數系統

- **存款轉換**: 1 元 = 1 點數
- **點數用途**: 購買物品給寵物（虛擬消費）
- **點數不影響真實存款**: 僅為虛擬貨幣

### 狀態系統

寵物狀態會根據記帳行為自動調整：

- **存款 (DEPOSIT)**
  - 飽足感 +5（每 100 元）
  - 心情值 +5（每 100 元）

- **支出 (EXPENSE)**
  - 心情值 -2（每 500 元，最低 0）

- **收入 (INCOME)**
  - 心情值 +3（每 1000 元）

- **購買物品**
  - 心情值 +5（每 10 點數）

### 狀態範圍

所有狀態值範圍：0-100
- 飽足感、心情值、健康度都會自動限制在此範圍內

## 📊 統計系統設計

### 月統計

- 總支出、總收入、總存款
- 每日記錄列表
- 類別分布圓餅圖

### 查詢優化

- 使用 Prisma 索引加速查詢
- 日期範圍查詢優化
- 類別統計使用聚合查詢

## 🔒 安全性考量

### 認證與授權

- 所有 API 都需要認證
- 使用者只能存取自己的資料
- Prisma 查詢自動過濾 userId

### 資料驗證

- 使用 Zod 進行 API 輸入驗證
- TypeScript 類型檢查
- Prisma Schema 層級驗證

### 環境變數

- 敏感資訊存放在 `.env.local`
- 不提交到版本控制
- 生產環境使用 Vercel 環境變數

## 🚀 部署架構

### 推薦部署方案

**Vercel + Supabase**
- Vercel: 部署 Next.js 應用
- Supabase: PostgreSQL 資料庫
- 自動 HTTPS、CDN、全球邊緣節點

### 環境變數設定

生產環境需要設定：
- `DATABASE_URL` (Supabase 連線字串)
- `NEXTAUTH_URL` (生產環境 URL)
- `NEXTAUTH_SECRET` (隨機字串)
- `GOOGLE_CLIENT_ID` (Google OAuth)
- `GOOGLE_CLIENT_SECRET` (Google OAuth)

## 📈 擴展性考量

### 未來可擴展功能

1. **多寵物系統**
   - 修改 Pet 表為 1:N 關聯
   - 新增寵物切換功能

2. **社交功能**
   - 好友系統
   - 排行榜
   - 分享功能

3. **進階統計**
   - 年度統計
   - 預算設定
   - 目標追蹤

4. **通知系統**
   - 每日提醒記帳
   - 寵物狀態提醒
   - 成就系統

### 效能優化

- 使用 Next.js Image 優化圖片
- API 回應快取
- 資料庫查詢優化
- 前端元件懶加載

## 🧪 測試策略（未來）

### 單元測試
- API 路由測試
- 工具函數測試

### 整合測試
- API 端點整合測試
- 資料庫操作測試

### E2E 測試
- 使用者流程測試
- 記帳流程測試

## 📝 程式碼規範

### TypeScript
- 嚴格模式啟用
- 所有函數都有類型定義
- 避免使用 `any`

### 命名規範
- 元件：PascalCase
- 函數：camelCase
- 常數：UPPER_SNAKE_CASE
- 檔案：kebab-case 或 PascalCase（元件）

### 檔案組織
- 相關功能放在同一資料夾
- 共用元件放在 `components/ui`
- API 路由按功能分組

