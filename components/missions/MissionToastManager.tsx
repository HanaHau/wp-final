'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'

interface MissionCompletedInfo {
  missionId: string
  missionCode: string
  name: string
  points: number
  type: 'daily' | 'weekly'
}

// 使用 localStorage 來持久化已顯示的任務，確保每個任務只顯示一次
const getShownMissions = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  const stored = localStorage.getItem('shownCompletedMissions')
  return stored ? new Set(JSON.parse(stored)) : new Set()
}

const setShownMission = (missionKey: string) => {
  if (typeof window === 'undefined') return
  const shown = getShownMissions()
  shown.add(missionKey)
  localStorage.setItem('shownCompletedMissions', JSON.stringify(Array.from(shown)))
}

export default function MissionToastManager() {
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const handleMissionCompleted = (event: CustomEvent<MissionCompletedInfo>) => {
      const mission = event.detail
      const missionKey = mission.missionCode // 使用 missionCode 作為唯一標識

      // 檢查是否已經顯示過這個任務的 toast
      const shownMissions = getShownMissions()
      if (shownMissions.has(missionKey)) {
        return // 已經顯示過，不再顯示
      }

      // 標記為已顯示（持久化到 localStorage）
      setShownMission(missionKey)

      // 顯示 toast 通知
      toast({
        title: '🎉 任務完成！',
        description: `${mission.name} - 獲得 ${mission.points} 點數`,
        action: (
          <ToastAction
            altText="前往領取"
            onClick={() => {
              router.push('/')
            }}
            className="bg-black text-white hover:bg-black/80 px-3 py-1.5 text-sm"
          >
            前往領取
          </ToastAction>
        ),
      })
    }

    // 監聽全局任務完成事件
    window.addEventListener('missionCompleted', handleMissionCompleted as EventListener)

    return () => {
      window.removeEventListener('missionCompleted', handleMissionCompleted as EventListener)
    }
  }, [toast, router])

  // 這個組件不渲染任何 UI
  return null
}
