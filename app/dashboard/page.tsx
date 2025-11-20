import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import DashboardContent from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <DashboardContent />
}

