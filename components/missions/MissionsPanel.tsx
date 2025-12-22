'use client'

import { useState, useEffect, useRef } from 'react'
import MissionCard from './MissionCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonMissionPanel } from '@/components/ui/skeleton-loader'
import { useSWR } from '@/lib/swr-config'

interface Mission {
  type: 'daily' | 'weekly'
  missionId: string
  name: string
  points: number
  progress: number
  target: number
  completed: boolean
  claimed?: boolean
}

interface MissionsPanelProps {
  onMissionCompleted?: (missions: Mission[]) => void
}

export default function MissionsPanel({ onMissionCompleted }: MissionsPanelProps = {}) {
  const previousMissionsRef = useRef<Mission[]>([])

  // 使用 SWR 獲取 missions，自動緩存和去重請求
  const { data: missionsData, error, isLoading: loading, mutate } = useSWR<Mission[]>(
    '/api/missions',
    {
      revalidateOnFocus: false, // 避免窗口聚焦時重新驗證
      revalidateOnReconnect: true, // 網路重連時重新驗證
      dedupingInterval: 10000, // 10 秒內去重相同請求
      refreshInterval: 0, // 不自動刷新
      onSuccess: (data) => {
        // 檢查是否有新完成的任務（任務狀態從未完成變為完成）
        const previousMissions = previousMissionsRef.current
        const missionsList = Array.isArray(data) ? data : []
        const newlyCompleted = missionsList.filter((m: Mission) => {
          const prev = previousMissions.find((pm: Mission) => pm.missionId === m.missionId)
          // 任務剛完成（之前未完成，現在完成了）且未領取
          return m.completed && !m.claimed && (!prev || !prev.completed)
        })

        // 如果有新完成的任務，通知父組件（只在任務完成當下）
        if (newlyCompleted.length > 0 && onMissionCompleted) {
          onMissionCompleted(newlyCompleted)
        }

        // 更新之前的任務狀態（在通知之後）
        previousMissionsRef.current = missionsList
      },
    }
  )

  // 監聽自定義事件來刷新任務列表（用於在關鍵操作後檢測任務完成）
  useEffect(() => {
    const handleRefresh = () => {
      mutate() // 使用 SWR 的 mutate 來重新驗證
    }
    
    window.addEventListener('refreshMissions', handleRefresh)
    return () => {
      window.removeEventListener('refreshMissions', handleRefresh)
    }
  }, [mutate])

  const handleMissionClaimed = () => {
    // 領取獎勵後立即刷新任務列表
    mutate() // 使用 SWR 的 mutate 來重新驗證
    // 通知其他組件更新未領取任務狀態
    window.dispatchEvent(new Event('missionClaimed'))
  }

  // 處理數據格式（API 直接返回 Mission[] 數組）
  const missions: Mission[] = Array.isArray(missionsData) 
    ? missionsData 
    : []

  const dailyMissions = missions.filter((m) => m.type === 'daily')
  const weeklyMissions = missions.filter((m) => m.type === 'weekly')

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse h-20" />
        ))}
      </div>
    )
  }

  console.log('渲染 MissionsPanel:', { 
    totalMissions: missions.length, 
    dailyCount: dailyMissions.length, 
    weeklyCount: weeklyMissions.length,
    dailyMissions,
    weeklyMissions 
  })

  // 調試：如果沒有任務，顯示調試信息
  if (missions.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <div className="text-black/40 text-sm mb-4">No missions</div>
        <button
          onClick={() => mutate()}
          className="text-xs text-black/60 underline hover:text-black"
        >
          Click to reload
        </button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="daily" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="grid grid-cols-2 flex-1">
          <TabsTrigger value="daily" className="gap-2">
            <Calendar className="h-4 w-4" />
            Daily Missions
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Target className="h-4 w-4" />
            Weekly Missions
          </TabsTrigger>
        </TabsList>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutate()}
          disabled={loading}
          className="ml-2 h-8 w-8 p-0"
          title="Refresh Missions"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <TabsContent value="daily" className="mt-0">
        {dailyMissions.length > 0 ? (
          <div className="space-y-3">
            {dailyMissions.map((mission) => (
              <MissionCard 
                key={`daily-${mission.missionId}`} 
                mission={mission}
                onClaimed={handleMissionClaimed}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-black/40 text-sm">
            {loading ? 'Loading...' : 'No daily missions'}
          </div>
        )}
      </TabsContent>
      <TabsContent value="weekly" className="mt-0">
        {weeklyMissions.length > 0 ? (
          <div className="space-y-3">
            {weeklyMissions.map((mission) => (
              <MissionCard 
                key={`weekly-${mission.missionId}`} 
                mission={mission}
                onClaimed={handleMissionClaimed}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-black/40 text-sm">
            {loading ? 'Loading...' : 'No weekly missions'}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

