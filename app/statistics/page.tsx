import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import StatisticsContent from '@/components/statistics/StatisticsContent'

export default async function StatisticsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <StatisticsContent />
}

