'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import FriendCard from './FriendCard'
import AddFriendDialog from './AddFriendDialog'
import InvitationDialog from './InvitationDialog'
import FriendActivityLog from './FriendActivityLog'
import FriendActivityToast from './FriendActivityToast'
import { useSWR } from '@/lib/swr-config'
import { UserPlus, Search, Mail, BookOpen } from 'lucide-react'

interface Friend {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipId: string
}

interface FriendsBoardProps {
  initialFriends?: Friend[] // 改為可選
}

export default function FriendsBoard({ initialFriends }: FriendsBoardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchFilter, setSearchFilter] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showInvitationDialog, setShowInvitationDialog] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)

  // 使用 SWR 獲取好友列表（支持快取和即時更新）
  const { data: friendsData, error: friendsError, isLoading: friendsLoading, mutate: mutateFriends } = useSWR<Friend[]>(
    '/api/friends',
    {
      fallbackData: initialFriends, // 如果有 initialFriends，使用它作為初始數據
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 秒內去重
    }
  )

  // 使用 SWR 獲取邀請數量
  const { data: invitationData, mutate: mutateInvitation } = useSWR<{ count: number }>(
    '/api/friends/invitations/count',
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // 每 30 秒自動刷新
    }
  )

  // 使用 SWR 獲取活動數量
  const { data: activityData, mutate: mutateActivity } = useSWR<{ unreadCount: number }>(
    '/api/friend-activities',
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // 每 30 秒自動刷新
    }
  )

  const friends = friendsData || []
  const invitationCount = invitationData?.count || 0
  const unreadActivityCount = activityData?.unreadCount || 0

  const filteredFriends = useMemo(() => {
    if (!searchFilter.trim()) {
      return friends
    }

    const filter = searchFilter.toLowerCase()
    return friends.filter((friend) => {
      const nameMatch = friend.name?.toLowerCase().includes(filter)
      const userIDMatch = friend.userID?.toLowerCase().includes(filter)
      const emailMatch = friend.email.toLowerCase().includes(filter)
      return nameMatch || userIDMatch || emailMatch
    })
  }, [friends, searchFilter])

  const handleFriendAdded = () => {
    // 使用 SWR mutate 刷新數據，不需要完整頁面重新載入
    mutateFriends()
  }

  const handleInvitationAccepted = () => {
    // 刷新邀請數量和好友列表
    mutateInvitation()
    mutateFriends()
  }

  const handleUpdateFriend = (friendId: string, updates: { mood?: number; fullness?: number }) => {
    // 樂觀更新：立即更新 UI
    mutateFriends(
      friends.map((friend) => {
        if (friend.id === friendId) {
          return { ...friend, ...updates }
        }
        return friend
      }),
      false // 不重新驗證
    )
  }

  // 載入狀態
  if (friendsLoading && !initialFriends) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="h-10 flex-1 sm:w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">
              Friend Rooms
            </h1>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search friends..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flex-1 sm:flex-initial sm:w-64"
              />
              <Button
                onClick={() => setShowInvitationDialog(true)}
                variant="outline"
                className="gap-2 relative"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Invitations</span>
                {invitationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {invitationCount > 9 ? '9+' : invitationCount}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">+ Add Friend</span>
                <span className="sm:hidden">+ Add</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-black/60 mb-2">
              {searchFilter ? 'No matching friends found' : 'No friends yet'}
            </p>
            {!searchFilter && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add First Friend
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onUpdate={handleUpdateFriend}
                onVisitRoom={() => router.push(`/friends/${friend.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AddFriendDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onFriendAdded={handleFriendAdded}
      />

      <InvitationDialog
        open={showInvitationDialog}
        onOpenChange={(open) => {
          setShowInvitationDialog(open)
          if (!open) {
            // 關閉對話框時刷新邀請數量
            mutateInvitation()
          }
        }}
        onInvitationAccepted={handleInvitationAccepted}
      />

      {/* 好友日誌浮動按鈕 */}
      <div className="fixed bottom-24 right-4 z-30">
        <Button
          size="icon"
          onClick={() => setShowActivityLog(!showActivityLog)}
          className="w-14 h-14 rounded-full bg-black text-white hover:bg-black/80 shadow-lg relative"
        >
          <BookOpen className="h-6 w-6" />
          {unreadActivityCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
            </span>
          )}
        </Button>
      </div>

      {showActivityLog && (
        <FriendActivityLog
          onClose={() => setShowActivityLog(false)}
          onUnreadCountUpdate={() => mutateActivity()}
        />
      )}

      {/* Toast notification for unread activities */}
      <FriendActivityToast />

      <Navigation />
    </div>
  )
}

