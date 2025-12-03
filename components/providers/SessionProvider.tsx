'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import PetDeathOverlay from '@/components/pet/PetDeathOverlay'
import MissionToastManager from '@/components/missions/MissionToastManager'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextAuthSessionProvider>
      {children}
      <PetDeathOverlay />
      <MissionToastManager />
    </NextAuthSessionProvider>
  )
}

