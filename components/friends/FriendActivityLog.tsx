'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Hand, UtensilsCrossed, User, BookOpen } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface FriendActivity {
  id: string
  actorId: string
  targetId: string
  petId: string
  petName: string
  actionType: 'pet' | 'feed' | 'visit'
  details: string | null
  isRead: boolean
  createdAt: string
  actor: {
    id: string
    name: string | null
    userID: string | null
    image: string | null
  }
}

interface FriendActivityLogProps {
  onClose: () => void
  onUnreadCountUpdate?: (count: number) => void
}

export default function FriendActivityLog({ onClose, onUnreadCountUpdate }: FriendActivityLogProps) {
  const [activities, setActivities] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchActivities()
  }, [])

  // Auto-mark as read when activities are visible (when panel is open)
  useEffect(() => {
    if (activities.length > 0 && !loading) {
      // Mark all currently visible unread activities as read after 2 seconds
      const unreadIds = activities.filter(a => !a.isRead).map(a => a.id)
      if (unreadIds.length > 0) {
        const timer = setTimeout(() => {
          markActivitiesAsRead(unreadIds)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [activities, loading])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/friend-activities')
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        if (onUnreadCountUpdate) {
          onUnreadCountUpdate(data.unreadCount || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const markActivitiesAsRead = async (activityIds: string[]) => {
    try {
      const res = await fetch('/api/friend-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityIds }),
      })
      
      if (res.ok) {
        setActivities(prev => prev.map(a => 
          activityIds.includes(a.id) ? { ...a, isRead: true } : a
        ))
        const newUnreadCount = activities.filter(a => !activityIds.includes(a.id) && !a.isRead).length
        if (onUnreadCountUpdate) {
          onUnreadCountUpdate(newUnreadCount)
        }
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/friend-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      
      if (res.ok) {
        setActivities(prev => prev.map(a => ({ ...a, isRead: true })))
        if (onUnreadCountUpdate) {
          onUnreadCountUpdate(0)
        }
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleActivityClick = (activityId: string, isRead: boolean) => {
    if (!isRead) {
      markActivitiesAsRead([activityId])
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'pet':
        return <Hand className="h-4 w-4 text-pink-500" />
      case 'feed':
        return <UtensilsCrossed className="h-4 w-4 text-orange-500" />
      case 'visit':
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getActionText = (activity: FriendActivity) => {
    const actorName = activity.actor.name || activity.actor.userID || 'Friend'
    switch (activity.actionType) {
      case 'pet':
        return `${actorName} petted your ${activity.petName}`
      case 'feed':
        return `${actorName} fed your ${activity.petName}`
      case 'visit':
        return `${actorName} visited your room`
      default:
        return `${actorName} interacted with your pet`
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const unreadCount = activities.filter(a => !a.isRead).length

  return (
    <div className="fixed right-4 bottom-40 w-80 h-[32rem] bg-white/95 backdrop-blur-md rounded-2xl border border-black/20 shadow-xl z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-black/20 flex items-center justify-between">
        <h2 className="text-lg font-bold text-black uppercase tracking-wide">Friend Activity Log</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-black/5 rounded transition-colors"
        >
          <span className="text-black/60 text-xl leading-none">×</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{unreadCount > 0 && (
          <div className="mb-3">
            <span className="text-xs text-black/60 uppercase tracking-wide">{unreadCount} unread</span>
            <p className="text-xs text-black/40 mt-1">Click card or wait 2 seconds to mark as read</p>
          </div>
        )}
        {loading ? (
          <div className="text-center py-12 text-black/60 text-sm">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-black/5 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-black/30" />
            </div>
            <p className="text-black/60 text-sm mb-1">No activity records yet</p>
            <p className="text-black/40 text-xs">
              Friend interactions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`p-3 rounded-xl cursor-pointer ${
                  activity.isRead
                    ? 'bg-white/60'
                    : 'bg-white border border-black/10'
                } transition-all hover:bg-white/80`}
                onClick={() => handleActivityClick(activity.id, activity.isRead)}
              >
                <div className="flex items-start gap-2.5">
                  {/* Actor Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/5 overflow-hidden flex items-center justify-center">
                    {activity.actor.image ? (
                      <Image
                        src={activity.actor.image}
                        alt={activity.actor.name || 'User'}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-black/40" />
                    )}
                  </div>

                  {/* Activity Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black leading-tight mb-0.5">
                      {getActionText(activity)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-black/50">{activity.details}</p>
                    )}
                    <p className="text-xs text-black/40 mt-0.5">
                      {getTimeAgo(activity.createdAt)}
                    </p>
                  </div>

                  {/* Action Icon - Right side */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {getActionIcon(activity.actionType)}
                    {!activity.isRead && (
                      <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

