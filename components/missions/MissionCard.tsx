'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

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

interface MissionCardProps {
  mission: Mission
  onClaimed?: () => void
}

export default function MissionCard({ mission, onClaimed }: MissionCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimed, setClaimed] = useState(mission.claimed || false)
  const { toast } = useToast()
  const progressPercent = Math.min((mission.progress / mission.target) * 100, 100)
  const isDaily = mission.type === 'daily'

  // 當 mission prop 更新時，同步狀態
  useEffect(() => {
    setClaimed(mission.claimed || false)
  }, [mission.claimed])

  const handleClaim = async () => {
    if (isClaiming || claimed || !mission.completed) return

    setIsClaiming(true)
    try {
      const res = await fetch('/api/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: mission.missionId,
          type: mission.type,
        }),
        credentials: 'include',
      })

      const data = await res.json()

      if (res.ok) {
        setClaimed(true)
        const pointsEarned = data.points || mission.points
        toast({
          title: 'Claimed Successfully!',
          description: `Earned ${pointsEarned} points`,
        })
        
        // 觸發事件通知主畫面更新points
        window.dispatchEvent(new CustomEvent('missionRewardClaimed', { 
          detail: { points: pointsEarned } 
        }))
        
        if (onClaimed) {
          onClaimed()
        }
      } else {
        toast({
          title: 'Claim Failed',
          description: data.error || 'Unable to claim reward',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Claim mission error:', error)
      toast({
        title: 'Claim Failed',
        description: 'An error occurred, please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-black/20 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-black text-sm">{mission.name}</h3>
            {mission.completed && !claimed && (
              <span className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-black/60 mt-1">+{mission.points} points</p>
          {/* 顯示進度條（每週任務或目標大於1的每日任務） */}
          {mission.target > 1 && (
            <div className="mt-2">
              <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    mission.completed ? 'bg-green-500' : 'bg-black'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs text-black/40 mt-1">
                {mission.progress}/{mission.target}
              </div>
            </div>
          )}
          {/* 目標為1的任務，顯示簡單的完成狀態 */}
          {mission.target === 1 && (
            <div className="text-xs text-black/40 mt-1">
              {mission.completed ? '✓ Completed' : 'In Progress'}
            </div>
          )}
        </div>
        
        {/* 右側領取按鈕 */}
        <div className="flex-shrink-0">
          {claimed ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Claimed</span>
            </div>
          ) : mission.completed ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming}
              size="sm"
              className="bg-black text-white hover:bg-black/80 text-xs px-3 py-1.5 h-auto"
            >
              {isClaiming ? 'Claiming...' : 'Claim'}
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              className="bg-black/10 text-black/40 border-0 cursor-not-allowed text-xs px-3 py-1.5 h-auto"
            >
              Incomplete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}


