'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Heart, UtensilsCrossed } from 'lucide-react'

export default function FriendActivityToast() {
  const { toast } = useToast()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // 只在組件首次掛載時檢查（用戶打開好友頁面時）
    if (!hasChecked) {
      checkUnreadActivities()
      setHasChecked(true)
    }
  }, [hasChecked])

  const checkUnreadActivities = async () => {
    try {
      const res = await fetch('/api/friend-activities')
      if (res.ok) {
        const data = await res.json()
        const unreadActivities = (data.activities || []).filter((a: any) => !a.isRead)

        if (unreadActivities.length > 0) {
          // 只顯示最新的3條未讀活動
          const recentActivities = unreadActivities.slice(0, 3)
          
          recentActivities.forEach((activity: any, index: number) => {
            setTimeout(() => {
              const actorName = activity.actor.name || activity.actor.userID || '好友'
              let title = ''
              let description = ''
              let icon = '🐾'

              switch (activity.actionType) {
                case 'pet':
                  title = '好友撫摸了你的寵物'
                  description = `${actorName} 撫摸了你的 ${activity.petName}`
                  icon = ''
                  break
                case 'feed':
                  title = '好友餵食了你的寵物'
                  description = `${actorName} 餵食了你的 ${activity.petName} ${activity.details || ''}`
                  icon = '🍖'
                  break
                case 'visit':
                  title = '好友訪問了你'
                  description = `${actorName} 訪問了你的房間`
                  icon = '👋'
                  break
              }

              toast({
                title: `${icon} ${title}`,
                description: description,
                duration: 4000,
              })
            }, index * 500) // 間隔500ms顯示每條通知
          })

          // 如果還有更多未讀活動
          if (unreadActivities.length > 3) {
            setTimeout(() => {
              toast({
                title: '還有更多活動',
                description: `查看好友日誌以了解全部 ${unreadActivities.length} 條互動記錄`,
                duration: 5000,
              })
            }, 2000)
          }
        }
      }
    } catch (error) {
      console.error('Check unread activities error:', error)
    }
  }

  return null // This is a logic-only component
}

