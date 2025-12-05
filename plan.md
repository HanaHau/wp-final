# Final Project – Midterm Plan

## Deploy Link

https://wp-final-phi.vercel.app

## 1. 本次 Prototype 已完成

- 完整的使用者認證系統（Google OAuth 登入）
- 寵物養成系統
  - 寵物狀態管理（心情、飽食度）
  - 寵物圖片上傳與畫筆編輯器（去背功能）
  - 寵物房間裝飾系統（貼紙、配件）
  - 自動狀態衰減機制
- 記帳功能
  - 新增/編輯/刪除交易記錄
  - 自訂類別管理
  - 收入/支出/存款類型
  - 餘額計算與顯示
- 統計分析頁面
  - 月度收支統計
  - 類別分析圖表
  - 每日交易明細
  - 預算管理
- 商店系統
  - 點數商城（食物、裝飾、配件）
  - 食物飽食度恢復系統（依價格決定恢復值）
  - 自訂貼紙上傳與分享
  - 公開貼紙市場
- 好友社交系統
  - 好友搜尋與邀請
  - 好友邀請管理（接受/拒絕）
  - 訪問好友房間
  - 撫摸與餵食好友寵物
  - 好友活動日誌（記錄互動歷史）
  - 即時 Toast 通知系統
- 每日/每週任務系統
  - 每日任務（記帳、查看寵物、訪問好友、撫摸好友寵物）
  - 每週任務（記帳達 5 天、與 3 位好友互動）
  - 任務進度追蹤與獎勵領取
  - 任務完成通知系統
- 個人資料頁面
  - 修改使用者名稱與 ID
  - 頭像上傳功能
- 響應式 UI 設計
  - 極簡黑白風格
  - iOS 26 設計語言
  - 浮動按鈕與側邊欄
  - 載入狀態與錯誤處理

## 2. 最終版本預計完成項目

- AI 聊天功能：整合 Gemini API 與寵物對話
- 社交互動升級
  - 好友房間合照功能（截圖系統）
  - 禮物系統（贈送貼紙給好友）
- UI/UX 全面升級
  - 精緻化所有頁面設計
  - 動畫效果優化
  - 更流暢的互動體驗
  - 微互動細節完善

## 3. 預期開發進度

- Week 1 (Dec 6 - Dec 12)
  - Day 1-2: 整合 Gemini API，實作寵物對話系統
  - Day 3-4: 完成好友房間截圖功能（Canvas API）
  - Day 5-7: 實作禮物系統（贈送/接收貼紙流程）

- Week 2 (Dec 13 - Dec 19)
  - Day 1-3: UI/UX 全面優化（動畫、過場、微互動）
  - Day 4-5: 效能優化與錯誤修復
  - Day 6-7: 最終測試、文件撰寫、Demo 準備

---

## 技術棧

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js (Google OAuth)
- **Deployment**: Vercel
- **AI Integration**: Google Gemini API (計劃中)

## 團隊成員工作分配

- 功能開發：寵物系統、社交系統、任務系統
- UI/UX 設計：介面設計、使用者體驗優化
- 資料庫設計：Schema 設計、資料遷移
- API 整合：第三方服務整合（Google OAuth, Gemini AI）

