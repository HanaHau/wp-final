'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import PetDeathOverlay from '@/components/pet/PetDeathOverlay'
import MissionToastManager from '@/components/missions/MissionToastManager'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SWRConfig value={swrConfig}>
      <NextAuthSessionProvider
        // 添加 refetchInterval 以減少頻繁的 session 請求
        refetchInterval={5 * 60} // 每 5 分鐘刷新一次 session（而不是預設的每 0 秒）
        // 添加 refetchOnWindowFocus 以減少不必要的請求
        refetchOnWindowFocus={false}
      >
        {children}
        <PetDeathOverlay />
        <MissionToastManager />
      </NextAuthSessionProvider>
    </SWRConfig>
  )
}

