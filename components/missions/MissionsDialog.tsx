'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MissionCard from './MissionCard'
import { Calendar, Target } from 'lucide-react'

interface Mission {
  type: 'daily' | 'weekly'
  missionId: string
  name: string
  points: number
  progress: number
  target: number
  completed: boolean
}

interface MissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MissionsDialog({ open, onOpenChange }: MissionsDialogProps) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchMissions()
      const interval = setInterval(fetchMissions, 3000)
      return () => clearInterval(interval)
    }
  }, [open])

  const fetchMissions = async () => {
    try {
      const res = await fetch('/api/missions')
      if (res.ok) {
        const data = await res.json()
        setMissions(data.missions || [])
      }
    } catch (error) {
      console.error('取得任務失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const dailyMissions = missions.filter((m) => m.type === 'daily')
  const weeklyMissions = missions.filter((m) => m.type === 'weekly')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-black uppercase tracking-wide">
            任務
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-black/60 text-sm">
              載入中...
            </div>
          ) : (
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="daily" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  每日任務
                </TabsTrigger>
                <TabsTrigger value="weekly" className="gap-2">
                  <Target className="h-4 w-4" />
                  每週任務
                </TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="space-y-3 mt-0">
                {dailyMissions.length === 0 ? (
                  <div className="text-center py-8 text-black/60 text-sm">
                    沒有每日任務
                  </div>
                ) : (
                  dailyMissions.map((mission) => (
                    <MissionCard key={mission.missionId} mission={mission} />
                  ))
                )}
              </TabsContent>
              <TabsContent value="weekly" className="space-y-3 mt-0">
                {weeklyMissions.length === 0 ? (
                  <div className="text-center py-8 text-black/60 text-sm">
                    沒有每週任務
                  </div>
                ) : (
                  weeklyMissions.map((mission) => (
                    <MissionCard key={mission.missionId} mission={mission} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

