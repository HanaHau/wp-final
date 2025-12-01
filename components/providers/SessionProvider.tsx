'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import PetDeathOverlay from '@/components/pet/PetDeathOverlay'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextAuthSessionProvider>
      {children}
      <PetDeathOverlay />
    </NextAuthSessionProvider>
  )
}

