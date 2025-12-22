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

  // 優化：先獲取用戶記錄，然後並行執行檢查和獲取數據（避免重複查詢用戶記錄）
  const { getCurrentUserRecord } = await import('@/lib/auth')
  const userRecord = await getCurrentUserRecord()
  
  if (!userRecord) {
    redirect('/auth/signin')
  }

  // 檢查是否完成首次設定（直接使用用戶記錄，避免重複查詢）
  if (!userRecord.isInitialized) {
    redirect('/setup')
  }

  // 檢查是否完成教學引導
  if (!userRecord.hasCompletedTutorial) {
    redirect('/tutorial')
  }

  // 獲取 dashboard summary（傳遞用戶記錄以避免重複查詢）
  const summary = await getDashboardSummary(userRecord)

  return <DashboardProvider summary={summary}>{children}</DashboardProvider>
}

