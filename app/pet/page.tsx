import { redirect } from 'next/navigation'
import { getSession, checkInitialization } from '@/lib/auth'
import PetRoomContent from '@/components/pet/PetRoomContent'

export default async function PetRoomPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // 檢查是否完成首次設定
  const { isInitialized } = await checkInitialization()
  if (!isInitialized) {
    redirect('/setup')
  }

  return <PetRoomContent />
}

