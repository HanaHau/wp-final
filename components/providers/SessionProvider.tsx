'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import PetDeathOverlay from '@/components/pet/PetDeathOverlay'
import MissionToastManager from '@/components/missions/MissionToastManager'
import { useEffect, useRef } from 'react'

// 簡單的 localStorage 快取 Provider
function localStorageProvider() {
  // 如果在伺服器端，返回空 Map
  if (typeof window === 'undefined') {
    return new Map()
  }

  // 從 localStorage 讀取快取
  const map = new Map<string, any>(
    JSON.parse(localStorage.getItem('swr-cache') || '[]')
  )

  // 註冊 beforeunload 事件，在頁面關閉前保存快取
  window.addEventListener('beforeunload', () => {
    const cacheData = JSON.stringify(Array.from(map.entries()))
    localStorage.setItem('swr-cache', cacheData)
  })

  return map
}

// 增強的 SWR 配置，包含 localStorage 持久化
const enhancedSwrConfig = {
  ...swrConfig,
  provider: localStorageProvider,
  // 使用持久化快取時，可以在頁面載入時立即顯示舊數據
  isVisible: () => true,
  isOnline: () => true,
}

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SWRConfig value={enhancedSwrConfig}>
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

