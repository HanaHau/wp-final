import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ShopContent from '@/components/shop/ShopContent'

export default async function ShopPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <ShopContent />
}

