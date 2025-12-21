import { redirect } from 'next/navigation'
import { getSession, checkInitialization } from '@/lib/auth'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { getDashboardSummary } from '@/lib/dashboard-data'
import type { DashboardSummary } from '@/contexts/DashboardContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // 檢查是否完成首次設定
  const { isInitialized, hasCompletedTutorial } = await checkInitialization()
  if (!isInitialized) {
    redirect('/setup')
  }

  // 檢查是否完成教學引導
  if (!hasCompletedTutorial) {
    redirect('/tutorial')
  }

  // 獲取 dashboard summary 資料（直接調用資料庫邏輯，不使用 HTTP 請求）
  const summary = await getDashboardSummary()

  return <DashboardProvider summary={summary}>{children}</DashboardProvider>
}

