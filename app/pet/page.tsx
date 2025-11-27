import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PetRoomContent from '@/components/pet/PetRoomContent'

export default async function PetRoomPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <PetRoomContent />
}

