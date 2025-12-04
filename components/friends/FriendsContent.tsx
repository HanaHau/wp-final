'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { Search, UserPlus, Users, Heart, Check, Clock, Mail, BookOpen } from 'lucide-react'
import Link from 'next/link'
import AddFriendDialog from './AddFriendDialog'
import InvitationDialog from './InvitationDialog'
import FriendActivityLog from './FriendActivityLog'
import FriendActivityToast from './FriendActivityToast'

interface Friend {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipId: string
}

interface SearchResult {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipStatus?: 'none' | 'friend' | 'pending_sent' | 'pending_received'
}

export default function FriendsContent() {
  const { toast } = useToast()
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showInvitationDialog, setShowInvitationDialog] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [invitationCount, setInvitationCount] = useState(0)
  const [unreadActivityCount, setUnreadActivityCount] = useState(0)

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

  const fetchActivityCount = async () => {
    try {
      const res = await fetch('/api/friend-activities')
      if (res.ok) {
        const data = await res.json()
        setUnreadActivityCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('取得活動數量失敗:', error)
    }
  }

  useEffect(() => {
    fetchFriends()
    fetchInvitationCount()
    fetchActivityCount()
    // 每30秒刷新一次邀請和活動數量
    const interval = setInterval(() => {
      fetchInvitationCount()
      fetchActivityCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends')
      if (res.ok) {
        const data = await res.json()
        setFriends(data)
      }
    } catch (error) {
      console.error('取得好友列表失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      } else {
        const error = await res.json()
        toast({
          title: 'Search Failed',
          description: error.error || 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: 'Success',
          description: data.message || 'Friend added',
        })
        fetchFriends()
        // Refresh search results to update status
        if (searchQuery.trim()) {
          handleSearch()
        } else {
          setSearchQuery('')
          setSearchResults([])
        }
      } else {
        const error = await res.json()
        // If already friends or pending, refresh search to update status
        if (error.error === 'Already friends' || error.error === 'Invitation sent, waiting for response') {
          if (searchQuery.trim()) {
            handleSearch()
          }
        }
        toast({
          title: 'Add Failed',
          description: error.error || 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Add Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Toast notification for unread activities */}
      <FriendActivityToast />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Friends</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowActivityLog(!showActivityLog)}
              variant="outline"
              className="gap-2 relative"
            >
              <BookOpen className="h-4 w-4" />
              Activity Log
              {unreadActivityCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
                </span>
              )}
            </Button>
            <Button
              onClick={() => setShowInvitationDialog(true)}
              variant="outline"
              className="gap-2 relative"
            >
              <Mail className="h-4 w-4" />
              Invitations
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
              Add Friend
            </Button>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="Search userID or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60 mb-2">
                Search Results
              </h3>
              {searchResults.map((user) => {
                const status = user.friendshipStatus || 'none'
                const isFriend = status === 'friend'
                const isPendingSent = status === 'pending_sent'
                
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full text-sm font-bold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold">{user.userID || user.email}</div>
                        <div className="text-sm text-black/60">{user.email}</div>
                      </div>
                    </div>
                    {isFriend ? (
                      <Button
                        size="sm"
                        disabled
                        variant="ghost"
                        className="gap-2 cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                        Friend
                      </Button>
                    ) : isPendingSent ? (
                      <Button
                        size="sm"
                        disabled
                        variant="ghost"
                        className="gap-2 cursor-not-allowed"
                      >
                        <Clock className="h-4 w-4" />
                        Pending
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddFriend(user.id)}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Friends List */}
        <div>
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Friends ({friends.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-black/60">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-black/60">
              <p className="mb-2">No friends yet</p>
              <p className="text-sm">Use the search bar above to find and add friends</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/friends/${friend.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm hover:bg-black/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full text-sm font-bold">
                      {friend.name?.charAt(0) || friend.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold">{friend.userID || friend.email}</div>
                      <div className="text-sm text-black/60">{friend.email}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Heart className="h-4 w-4" />
                    View
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddFriendDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onFriendAdded={() => {
          fetchFriends()
          if (searchQuery.trim()) {
            handleSearch()
          }
        }}
      />

      <InvitationDialog
        open={showInvitationDialog}
        onOpenChange={(open) => {
          setShowInvitationDialog(open)
          if (!open) {
            fetchInvitationCount()
          }
        }}
        onInvitationAccepted={() => {
          fetchInvitationCount()
          fetchFriends()
        }}
      />

      {showActivityLog && (
        <FriendActivityLog
          onClose={() => setShowActivityLog(false)}
          onUnreadCountUpdate={(count) => setUnreadActivityCount(count)}
        />
      )}

      <Navigation />
    </div>
  )
}


