import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PetSettingsContent from '@/components/pet/PetSettingsContent'

export default async function PetSettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  return <PetSettingsContent />
}

