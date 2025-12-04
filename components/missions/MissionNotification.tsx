'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

interface CompletedMission {
  missionId: string
  name: string
  points: number
  type: 'daily' | 'weekly'
}

export default function MissionNotification() {
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([])
  const [showNotification, setShowNotification] = useState(false)
  const [hasShownNotification, setHasShownNotification] = useState<string>('')

  useEffect(() => {
    const checkCompletedMissions = async () => {
      try {
        const res = await fetch('/api/missions/completed')
        if (res.ok) {
          const data = await res.json()
          if (data.missions && data.missions.length > 0) {
            const missionIds = data.missions.map((m: CompletedMission) => m.missionId).sort().join(',')
            setCompletedMissions(data.missions)
            // 只在第一次檢測到這些任務時顯示通知
            if (hasShownNotification !== missionIds) {
              setShowNotification(true)
              setHasShownNotification(missionIds)
            }
          } else {
            // 如果沒有完成任務，重置狀態
            setHasShownNotification('')
          }
        }
      } catch (error) {
        console.error('檢查完成任務失敗:', error)
      }
    }

    // 只在初始載入時檢查一次，之後不再自動刷新
    checkCompletedMissions()
  }, [hasShownNotification])

  if (!showNotification || completedMissions.length === 0) {
    return null
  }

  return (
    <div className="fixed top-20 left-4 z-50 bg-white rounded-xl border border-black/20 shadow-xl p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-black mb-1">Mission Completed!</h3>
          <div className="text-sm text-black/60 mb-2">
            {completedMissions.map((m) => (
              <div key={m.missionId}>{m.name} +{m.points} points</div>
            ))}
          </div>
          <p className="text-xs text-black/40">Please go to the missions panel to claim rewards</p>
        </div>
        <button
          onClick={() => setShowNotification(false)}
          className="text-black/40 hover:text-black/60 transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

