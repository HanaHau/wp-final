'use client'

import { useState, useEffect, useRef } from 'react'
import MissionCard from './MissionCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonMissionPanel } from '@/components/ui/skeleton-loader'

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
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const previousMissionsRef = useRef<Mission[]>([])

  useEffect(() => {
    // 只在組件掛載時獲取一次任務
    fetchMissions()
  }, [])

  // 監聽自定義事件來刷新任務列表（用於在關鍵操作後檢測任務完成）
  useEffect(() => {
    const handleRefresh = () => {
      fetchMissions()
    }
    
    window.addEventListener('refreshMissions', handleRefresh)
    return () => {
      window.removeEventListener('refreshMissions', handleRefresh)
    }
  }, [])

  const handleMissionClaimed = () => {
    // 領取獎勵後立即刷新任務列表
    fetchMissions()
    // 通知其他組件更新未領取任務狀態
    window.dispatchEvent(new Event('missionClaimed'))
  }

  const fetchMissions = async () => {
    try {
      setLoading(true)
      console.log('開始獲取任務...')
      const res = await fetch('/api/missions', {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('API 響應狀態:', res.status, res.statusText)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: '無法解析錯誤響應' }))
        console.error('取得任務失敗:', res.status, res.statusText, errorData)
        setMissions([])
        return
      }
      
      const data = await res.json()
      console.log('任務 API 回應:', { 
        status: res.status, 
        data, 
        isArray: Array.isArray(data),
        dataType: typeof data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A'
      })
      
      // API 直接返回 missions 數組
      let missionsList: Mission[] = []
      if (Array.isArray(data)) {
        missionsList = data
      } else if (data && typeof data === 'object') {
        missionsList = data.missions || data.data || []
      }
      
      console.log('解析後的任務列表:', missionsList, '數量:', missionsList.length)
      console.log('每日任務:', missionsList.filter((m: Mission) => m.type === 'daily'))
      console.log('每週任務:', missionsList.filter((m: Mission) => m.type === 'weekly'))
      
      if (missionsList.length === 0) {
        console.warn('⚠️ 任務列表為空！原始 API 返回:', JSON.stringify(data, null, 2))
      }
      
      // 檢查是否有新完成的任務（任務狀態從未完成變為完成）
      const previousMissions = previousMissionsRef.current
      const newlyCompleted = missionsList.filter((m: Mission) => {
        const prev = previousMissions.find((pm: Mission) => pm.missionId === m.missionId)
        // 任務剛完成（之前未完成，現在完成了）且未領取
        // 這確保只在任務完成當下觸發
        return m.completed && !m.claimed && (!prev || !prev.completed)
      })

      // 更新任務列表
      setMissions(missionsList)
      
      // 如果有新完成的任務，通知父組件（只在任務完成當下）
      if (newlyCompleted.length > 0 && onMissionCompleted) {
        // 立即通知，不延遲
        onMissionCompleted(newlyCompleted)
      }
      
      // 更新之前的任務狀態（在通知之後）
      previousMissionsRef.current = missionsList
    } catch (error) {
      console.error('取得任務失敗:', error)
      console.error('錯誤詳情:', error instanceof Error ? error.message : String(error))
      setMissions([])
    } finally {
      setLoading(false)
    }
  }

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
          onClick={fetchMissions}
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
          onClick={fetchMissions}
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

