import { redirect } from 'next/navigation'
import { getSession, checkInitialization } from '@/lib/auth'
import StatisticsContent from '@/components/statistics/StatisticsContent'

export default async function StatisticsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // 檢查是否完成首次設定
  const { isInitialized } = await checkInitialization()
  if (!isInitialized) {
    redirect('/setup')
  }

  return <StatisticsContent />
}

