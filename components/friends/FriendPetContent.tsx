'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import FriendRoom from './FriendRoom'

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

  useEffect(() => {
    fetchFriendPet()
  }, [friendId])

  const fetchFriendPet = async () => {
    try {
      const res = await fetch(`/api/friends/${friendId}`)
      if (res.ok) {
        const data = await res.json()
        setData(data)
        
        // 檢查 API 響應中是否有任務完成信息
        if (data.missionCompleted) {
          // Dispatch 全局事件，讓 MissionToastManager 處理顯示
          window.dispatchEvent(new CustomEvent('missionCompleted', { detail: data.missionCompleted }))
        }
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

  const handleLeave = () => {
    router.push('/friends')
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
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
    <FriendRoom
      pet={{
        id: data.pet.id,
        name: data.pet.name,
        imageUrl: data.pet.imageUrl,
        facingDirection: data.pet.facingDirection,
        mood: data.pet.mood,
        fullness: data.pet.fullness,
      }}
      user={data.user}
      stickers={data.pet.stickers || []}
      accessories={data.pet.accessories || []}
      friendId={friendId}
      onLeave={handleLeave}
    />
  )
}


