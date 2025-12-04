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
          title: 'Success',
          description: data.message || 'Friend added',
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
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Search by userID or email to find and add friends
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search userID or email..."
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
                        disabled={addingFriendId === user.id}
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

          {hasSearched && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-4 text-black/60 text-sm">
              No matching users found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

