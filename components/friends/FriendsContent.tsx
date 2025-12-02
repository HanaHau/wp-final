'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { Search, UserPlus, Users, Heart } from 'lucide-react'
import Link from 'next/link'

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
}

export default function FriendsContent() {
  const { toast } = useToast()
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFriends()
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
          title: '搜尋失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '搜尋失敗',
        description: '請稍後再試',
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
          title: '成功',
          description: data.message || '好友已加入',
        })
        fetchFriends()
        setSearchQuery('')
        setSearchResults([])
      } else {
        const error = await res.json()
        toast({
          title: '加入失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '加入失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    }
  }

  const isAlreadyFriend = (userId: string) => {
    return friends.some(f => f.id === userId)
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 uppercase tracking-wide">好友</h1>

        {/* Search Section */}
        <div className="mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="搜尋 userID 或 email..."
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
              搜尋
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60 mb-2">
                搜尋結果
              </h3>
              {searchResults.map((user) => (
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
                  {isAlreadyFriend(user.id) ? (
                    <span className="text-sm text-black/40">已是好友</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAddFriend(user.id)}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      加入
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends List */}
        <div>
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide flex items-center gap-2">
            <Users className="h-5 w-5" />
            我的好友 ({friends.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-black/60">載入中...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-black/60">
              <p className="mb-2">還沒有好友</p>
              <p className="text-sm">使用上方搜尋欄來尋找並加入好友</p>
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
                    查看
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  )
}


