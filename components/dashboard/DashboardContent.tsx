'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Room from '@/components/pet/Room'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import Navigation from './Navigation'
import { Plus } from 'lucide-react'
import HamburgerMenu from './HamburgerMenu'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
}

interface RoomSticker {
  id: string
  stickerId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  layer: 'floor' | 'wall-left' | 'wall-right'
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const [pet, setPet] = useState<Pet | null>(null)
  const [stickers, setStickers] = useState<RoomSticker[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPet()
    fetchStickers()
  }, [])

  const fetchPet = async () => {
    try {
      const res = await fetch('/api/pet')
      const data = await res.json()
      setPet(data)
    } catch (error) {
      console.error('取得寵物資訊失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStickers = async () => {
    try {
      const res = await fetch('/api/pet/stickers')
      if (res.ok) {
        const data = await res.json()
        setStickers(data)
      }
    } catch (error) {
      console.error('取得貼紙失敗:', error)
    }
  }

  const handleTransactionAdded = () => {
    fetchPet()
    fetchStickers()
    setIsDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* 頂部資訊欄 - 極簡設計 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start p-4 pointer-events-none">
        {/* 左側：資源顯示 */}
        <div className="flex gap-3 pointer-events-auto">
          {/* 點數 */}
          <div className="bg-white border-2 border-black px-3 py-2">
            <div className="text-xs text-black/60 uppercase tracking-wide">Points</div>
            <div className="text-lg font-bold text-black">{pet?.points || 0}</div>
          </div>
          
          {/* 心情 */}
          <div className="bg-white border-2 border-black px-3 py-2">
            <div className="text-xs text-black/60 uppercase tracking-wide">Mood</div>
            <div className="text-lg font-bold text-black">{pet?.mood || 50}%</div>
          </div>
        </div>

        {/* 右側：漢堡選單 */}
        <div className="pointer-events-auto">
          <HamburgerMenu />
        </div>
      </div>

      {/* 主內容區 - 房間顯示 */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20 pt-24">
        <Room pet={pet} stickers={stickers} />
      </main>

      {/* 記帳對話框 */}
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleTransactionAdded}
      />

      {/* 底部導航 */}
      <Navigation />

      {/* 新增記帳按鈕 - 固定在底部 */}
      <div className="fixed bottom-24 right-4 z-30">
        <Button
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          className="w-14 h-14 border-2 border-black rounded-full"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

