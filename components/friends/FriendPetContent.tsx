'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Navigation from '@/components/dashboard/Navigation'
import Room from '@/components/pet/Room'
import { ArrowLeft, Heart, Utensils, MessageSquare } from 'lucide-react'

interface FriendPetData {
  pet: {
    id: string
    name: string
    imageUrl: string | null
    facingDirection: string
    points: number
    fullness: number
    mood: number
    stickers: any[]
    accessories: any[]
  }
  user: {
    id: string
    email: string
    userID: string | null
    name: string | null
    image: string | null
  }
}

export default function FriendPetContent({ friendId }: { friendId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<FriendPetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [petting, setPetting] = useState(false)
  const [feeding, setFeeding] = useState(false)
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchFriendPet()
  }, [friendId])

  const fetchFriendPet = async () => {
    try {
      const res = await fetch(`/api/friends/${friendId}`)
      if (res.ok) {
        const data = await res.json()
        setData(data)
      } else {
        const error = await res.json()
        toast({
          title: '載入失敗',
          description: error.error || '無法載入好友的寵物',
          variant: 'destructive',
        })
        router.push('/friends')
      }
    } catch (error) {
      toast({
        title: '載入失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
      router.push('/friends')
    } finally {
      setLoading(false)
    }
  }

  const handlePet = async () => {
    if (petting) return
    setPetting(true)
    try {
      const res = await fetch(`/api/friends/${friendId}/pet`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        toast({
          title: '成功',
          description: data.message || '已撫摸好友的寵物',
        })
        fetchFriendPet()
      } else {
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
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
    if (feeding) return
    setFeeding(true)
    try {
      const res = await fetch(`/api/friends/${friendId}/feed`, {
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
        fetchFriendPet()
      } else {
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setFeeding(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: '請輸入留言',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch(`/api/friends/${friendId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          petId: data?.pet.id,
        }),
      })
      if (res.ok) {
        toast({
          title: '成功',
          description: '留言已送出',
        })
        setMessage('')
        setShowMessageInput(false)
      } else {
        const error = await res.json()
        toast({
          title: '失敗',
          description: error.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🐱</div>
          <p className="text-sm uppercase tracking-wide">載入中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-white/95 backdrop-blur-md border-b border-black/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/friends')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{data.user.userID || data.user.email}</h1>
              <p className="text-sm text-black/60">的房間</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Room
          pet={{
            id: data.pet.id,
            name: data.pet.name,
            imageUrl: data.pet.imageUrl,
            facingDirection: data.pet.facingDirection,
            points: data.pet.points,
            fullness: data.pet.fullness,
            mood: data.pet.mood,
          }}
          stickers={data.pet.stickers}
          accessories={data.pet.accessories}
        />
      </div>

      <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handlePet}
              disabled={petting}
              variant="outline"
              className="gap-2"
            >
              <Heart className="h-4 w-4" />
              摸摸
            </Button>
            <Button
              onClick={handleFeed}
              disabled={feeding}
              variant="outline"
              className="gap-2"
            >
              <Utensils className="h-4 w-4" />
              餵食
            </Button>
            <Button
              onClick={() => setShowMessageInput(!showMessageInput)}
              variant="outline"
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              留言
            </Button>
          </div>

          {showMessageInput && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-black/20 shadow-lg">
              <Input
                placeholder="輸入留言..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage()
                  }
                }}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  className="flex-1"
                >
                  送出
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowMessageInput(false)
                    setMessage('')
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  )
}


