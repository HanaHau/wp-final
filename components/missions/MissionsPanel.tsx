'use client'

import { useState, useEffect } from 'react'
import MissionCard from './MissionCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Calendar } from 'lucide-react'

interface Mission {
  type: 'daily' | 'weekly'
  missionId: string
  name: string
  points: number
  progress: number
  target: number
  completed: boolean
}

export default function MissionsPanel() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMissions()
    // 更頻繁地檢查任務狀態（每2秒）
    const interval = setInterval(fetchMissions, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleMissionClaimed = () => {
    // 重新獲取任務列表
    fetchMissions()
  }

  const fetchMissions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/missions', {
        cache: 'no-store',
        credentials: 'include',
      })
      
      const data = await res.json()
      console.log('任務 API 回應:', { status: res.status, data, isArray: Array.isArray(data) })
      
      if (!res.ok) {
        console.error('取得任務失敗:', res.status, res.statusText, data)
        setMissions([])
        return
      }
      
      // API 直接返回 missions 數組
      const missionsList = Array.isArray(data) ? data : (data.missions || [])
      console.log('任務列表:', missionsList, '數量:', missionsList.length)
      console.log('每日任務:', missionsList.filter((m: Mission) => m.type === 'daily'))
      console.log('每週任務:', missionsList.filter((m: Mission) => m.type === 'weekly'))
      
      if (missionsList.length === 0) {
        console.warn('⚠️ 任務列表為空！API 返回:', data)
      }
      
      setMissions(missionsList)
    } catch (error) {
      console.error('取得任務失敗:', error)
      setMissions([])
    } finally {
      setLoading(false)
    }
  }

  const dailyMissions = missions.filter((m) => m.type === 'daily')
  const weeklyMissions = missions.filter((m) => m.type === 'weekly')

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-black/60 text-sm">載入中...</div>
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

  return (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="daily" className="gap-2">
          <Calendar className="h-4 w-4" />
          每日任務
        </TabsTrigger>
        <TabsTrigger value="weekly" className="gap-2">
          <Target className="h-4 w-4" />
          每週任務
        </TabsTrigger>
      </TabsList>
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
            {loading ? '載入中...' : '沒有每日任務'}
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
            {loading ? '載入中...' : '沒有每週任務'}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

