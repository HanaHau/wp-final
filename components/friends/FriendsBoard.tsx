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
import { UserPlus, Search, Mail } from 'lucide-react'

interface Friend {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipId: string
}

interface FriendsBoardProps {
  initialFriends: Friend[]
}

export default function FriendsBoard({ initialFriends }: FriendsBoardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [friends, setFriends] = useState<Friend[]>(initialFriends)
  const [searchFilter, setSearchFilter] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showInvitationDialog, setShowInvitationDialog] = useState(false)
  const [invitationCount, setInvitationCount] = useState(0)

  const fetchInvitationCount = async () => {
    try {
      const res = await fetch('/api/friends/invitations/count')
      if (res.ok) {
        const data = await res.json()
        setInvitationCount(data.count || 0)
      }
    } catch (error) {
      console.error('取得邀請數量失敗:', error)
    }
  }

  useEffect(() => {
    fetchInvitationCount()
    // 每30秒刷新一次邀請數量
    const interval = setInterval(fetchInvitationCount, 30000)
    return () => clearInterval(interval)
  }, [])

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
    window.location.reload()
  }

  const handleInvitationAccepted = () => {
    fetchInvitationCount()
    window.location.reload()
  }

  const handleUpdateFriend = (friendId: string, updates: { mood?: number; fullness?: number }) => {
    setFriends((prev) =>
      prev.map((friend) => {
        if (friend.id === friendId) {
          return { ...friend, ...updates }
        }
        return friend
      })
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">
              好友小屋
            </h1>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="搜尋好友..."
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
                <span className="hidden sm:inline">邀請</span>
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
              {searchFilter ? '沒有找到符合的好友' : '還沒有好友'}
            </p>
            {!searchFilter && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                加入第一個好友
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
            fetchInvitationCount()
          }
        }}
        onInvitationAccepted={handleInvitationAccepted}
      />

      <Navigation />
    </div>
  )
}

