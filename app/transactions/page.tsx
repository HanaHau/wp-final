import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import TransactionsContent from '@/components/transactions/TransactionsContent'

export default async function TransactionsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <TransactionsContent />
}

