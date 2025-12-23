import { redirect } from 'next/navigation'
import { getSession, getCurrentUserRecord } from '@/lib/auth'
import { DashboardProvider } from '@/contexts/DashboardContext'

// 優化：Layout 只負責認證檢查，不負責數據獲取
// 數據獲取移到客戶端組件，使用 SWR 快取
// 這樣可以：
// 1. 大幅減少首次載入時間（不再阻塞渲染）
// 2. 讓頁面可以立即顯示骨架屏
// 3. 避免 Server/Client 數據重複獲取
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // 只獲取用戶記錄用於認證檢查
  const userRecord = await getCurrentUserRecord()
  
  if (!userRecord) {
    redirect('/auth/signin')
  }

  // 檢查是否完成首次設定
  if (!userRecord.isInitialized) {
    redirect('/setup')
  }

  // 檢查是否完成教學引導
  if (!userRecord.hasCompletedTutorial) {
    redirect('/tutorial')
  }

  // 不再在 Layout 中獲取 dashboard summary
  // 客戶端組件會通過 SWR 自行獲取數據
  // 傳入 null，讓客戶端組件顯示載入狀態並獲取數據
  return <DashboardProvider summary={null}>{children}</DashboardProvider>
}

