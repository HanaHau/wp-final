'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import PetDisplay from '@/components/pet/PetDisplay'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import Navigation from './Navigation'
import { LogOut, Plus } from 'lucide-react'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const [pet, setPet] = useState<Pet | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPet()
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

  const handleTransactionAdded = () => {
    fetchPet()
    setIsDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 房間背景 */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/room.jpg.webp"
          alt="房間背景"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* 內容層 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 頂部資源欄 - 浮動設計 */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
          {/* 左側：資源顯示 */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* 寵物點數卡片 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg border-2 border-purple-200 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-lg">💎</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">點數</span>
                <span className="text-lg font-bold text-purple-700">
                  {pet?.points || 0}
                </span>
              </div>
            </div>
            
            {/* 心情值卡片 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-lg border-2 border-pink-200 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-red-400 rounded-full flex items-center justify-center">
                <span className="text-lg">❤️</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">心情</span>
                <span className="text-lg font-bold text-pink-700">
                  {pet?.mood || 50}%
                </span>
              </div>
            </div>
          </div>

          {/* 右側：操作按鈕 */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* 用戶選單 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border-2 border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => signOut()}
                  className="h-8 px-2"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 新增記帳按鈕 - 在個人帳號下方 */}
            <Button
              size="lg"
              onClick={() => setIsDialogOpen(true)}
              className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-2 border-white/50"
            >
              <Plus className="h-7 w-7 text-white" />
            </Button>
          </div>
        </div>

        {/* 主內容區 - 寵物顯示 */}
        <main className="flex-1 flex items-center justify-center px-4 pb-24">
          <div className="relative">
            <PetDisplay pet={pet} />
          </div>
        </main>

        {/* 記帳對話框 */}
        <TransactionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleTransactionAdded}
        />

        {/* 底部導航 */}
        <Navigation />
      </div>
    </div>
  )
}

