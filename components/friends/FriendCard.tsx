'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Heart, Utensils, Home } from 'lucide-react'
import Image from 'next/image'

interface Friend {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipId: string
}

interface FriendPetData {
  pet: {
    id: string
    name: string
    imageUrl: string | null
    mood: number
    fullness: number
  }
  user: {
    id: string
    email: string
    userID: string | null
    name: string | null
  }
}

interface FriendCardProps {
  friend: Friend
  onUpdate: (friendId: string, updates: { mood?: number; fullness?: number }) => void
  onVisitRoom: () => void
}

export default function FriendCard({ friend, onUpdate, onVisitRoom }: FriendCardProps) {
  const { toast } = useToast()
  const [petData, setPetData] = useState<FriendPetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [petting, setPetting] = useState(false)
  const [feeding, setFeeding] = useState(false)

  useEffect(() => {
    fetchPetData()
  }, [friend.id])

  const fetchPetData = async () => {
    try {
      const res = await fetch(`/api/friends/${friend.id}`)
      if (res.ok) {
        const data = await res.json()
        setPetData(data)
      }
    } catch (error) {
      console.error('取得好友寵物資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePet = async () => {
    if (petting || !petData) return
    setPetting(true)

    const oldMood = petData.pet.mood
    const newMood = Math.min(100, oldMood + 1)
    onUpdate(friend.id, { mood: newMood })
    setPetData({
      ...petData,
      pet: { ...petData.pet, mood: newMood },
    })

    try {
      const res = await fetch(`/api/friends/${friend.id}/pet`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        toast({
          title: '成功',
          description: data.message || '已撫摸好友的寵物',
        })
        fetchPetData()
      } else {
        onUpdate(friend.id, { mood: oldMood })
        setPetData({
          ...petData,
          pet: { ...petData.pet, mood: oldMood },
        })
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      onUpdate(friend.id, { mood: oldMood })
      setPetData({
        ...petData,
        pet: { ...petData.pet, mood: oldMood },
      })
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setPetting(false)
    }
  }

  const handleFeed = async () => {
    if (feeding || !petData) return
    setFeeding(true)

    const oldFullness = petData.pet.fullness
    const newFullness = Math.min(100, oldFullness + 5)
    onUpdate(friend.id, { fullness: newFullness })
    setPetData({
      ...petData,
      pet: { ...petData.pet, fullness: newFullness },
    })

    try {
      const res = await fetch(`/api/friends/${friend.id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'food1' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({
          title: '成功',
          description: data.message || '已餵食好友的寵物',
        })
        fetchPetData()
      } else {
        onUpdate(friend.id, { fullness: oldFullness })
        setPetData({
          ...petData,
          pet: { ...petData.pet, fullness: oldFullness },
        })
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      onUpdate(friend.id, { fullness: oldFullness })
      setPetData({
        ...petData,
        pet: { ...petData.pet, fullness: oldFullness },
      })
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setFeeding(false)
    }
  }


  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-black/20 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl">
        <div className="p-4 border-b border-black/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full text-sm font-bold">
              {friend.name?.charAt(0) || friend.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-black truncate">
                {friend.userID || friend.name || friend.email}
              </div>
              <div className="text-xs text-black/60 truncate">
                {friend.userID ? `@${friend.userID}` : friend.email}
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black/40 text-sm">載入中...</div>
            </div>
          ) : petData ? (
            <>
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/5 to-transparent" />
              </div>
              
              {petData.pet.imageUrl ? (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="relative w-24 h-24">
                    <Image
                      src={petData.pet.imageUrl}
                      alt={petData.pet.name}
                      fill
                      className="object-contain drop-shadow-lg"
                      sizes="96px"
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center text-4xl shadow-md">
                    🐱
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black/40 text-sm">還沒有寵物</div>
            </div>
          )}
        </div>

        {petData && (
          <div className="p-4 space-y-2 border-b border-black/20">
            <div className="text-sm font-semibold text-black">
              {petData.pet.name}
            </div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-xs text-black/60 mb-1">
                  <span>心情</span>
                  <span>{petData.pet.mood}/100</span>
                </div>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${petData.pet.mood}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-black/60 mb-1">
                  <span>飽足感</span>
                  <span>{petData.pet.fullness}/100</span>
                </div>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${petData.pet.fullness}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handlePet}
              disabled={petting || !petData}
              variant="outline"
              className="flex-1 min-w-[80px]"
            >
              <Heart className="h-3 w-3 mr-1" />
              摸摸
            </Button>
            <Button
              size="sm"
              onClick={handleFeed}
              disabled={feeding || !petData}
              variant="outline"
              className="flex-1 min-w-[80px]"
            >
              <Utensils className="h-3 w-3 mr-1" />
              餵食
            </Button>
            <Button
              size="sm"
              onClick={onVisitRoom}
              variant="outline"
              className="flex-1 min-w-[80px]"
            >
              <Home className="h-3 w-3 mr-1" />
              房間
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

