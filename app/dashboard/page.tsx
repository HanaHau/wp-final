import { redirect } from 'next/navigation'
import { getSession, checkInitialization } from '@/lib/auth'
import DashboardContent from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
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

  return <DashboardContent />
}

