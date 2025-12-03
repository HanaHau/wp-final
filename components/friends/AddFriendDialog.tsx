'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Search, UserPlus, Check, Clock } from 'lucide-react'

interface SearchResult {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipStatus?: 'none' | 'friend' | 'pending_sent' | 'pending_received'
}

interface AddFriendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFriendAdded: () => void
}

export default function AddFriendDialog({
  open,
  onOpenChange,
  onFriendAdded,
}: AddFriendDialogProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)
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
    setAddingFriendId(friendId)
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
        onFriendAdded()
        // Refresh search results to update status
        if (searchQuery.trim()) {
          handleSearch()
        } else {
          setSearchQuery('')
          setSearchResults([])
          setHasSearched(false)
        }
      } else {
        const error = await res.json()
        // If already friends or pending, refresh search to update status
        if (error.error === '已經是好友了' || error.error === '已送出邀請，等待對方回應') {
          if (searchQuery.trim()) {
            handleSearch()
          }
        }
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
    } finally {
      setAddingFriendId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset state when dialog closes
        setSearchQuery('')
        setSearchResults([])
        setHasSearched(false)
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>加入好友</DialogTitle>
          <DialogDescription>
            搜尋 userID 或 email 來尋找並加入好友
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜尋 userID 或 email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                // Reset hasSearched when user changes the query
                if (hasSearched) {
                  setHasSearched(false)
                  setSearchResults([])
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.map((user) => {
                const status = user.friendshipStatus || 'none'
                const isFriend = status === 'friend'
                const isPendingSent = status === 'pending_sent'
                
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm"
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
                        好友
                      </Button>
                    ) : isPendingSent ? (
                      <Button
                        size="sm"
                        disabled
                        variant="ghost"
                        className="gap-2 cursor-not-allowed"
                      >
                        <Clock className="h-4 w-4" />
                        等待回應
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddFriend(user.id)}
                        disabled={addingFriendId === user.id}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        加入
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-4 text-black/60 text-sm">
              沒有找到符合的使用者
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

