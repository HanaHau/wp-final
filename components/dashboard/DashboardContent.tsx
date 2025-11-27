'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Room from '@/components/pet/Room'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import Navigation from './Navigation'
import { Plus, Package } from 'lucide-react'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
  needsAttention?: boolean
  isSick?: boolean
  isUnhappy?: boolean
  isHungry?: boolean
  daysSinceInteraction?: number
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

interface AvailableSticker {
  stickerId: string
  name: string
  emoji: string
  count: number
}

interface FoodItem {
  itemId: string
  name: string
  emoji: string
  count: number
}

interface PetAccessory {
  id: string
  accessoryId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  imageUrl?: string | null
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const [pet, setPet] = useState<Pet | null>(null)
  const [stickers, setStickers] = useState<RoomSticker[]>([])
  const [availableStickers, setAvailableStickers] = useState<AvailableSticker[]>([])
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [accessories, setAccessories] = useState<PetAccessory[]>([])
  const [availableAccessories, setAvailableAccessories] = useState<AvailableAccessory[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEditPanel, setShowEditPanel] = useState(false)

  useEffect(() => {
    fetchPet()
    fetchStickers()
    fetchStickerInventory()
    fetchFoodInventory()
    fetchAccessories()
    fetchAccessoryInventory()
  }, [])

  // 當打開倉庫時，自動進入編輯模式（通過 Room 組件內部處理）

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

  const fetchStickerInventory = async () => {
    try {
      const res = await fetch('/api/pet/stickers/inventory')
      if (res.ok) {
        const data = await res.json()
        setAvailableStickers(data)
      }
    } catch (error) {
      console.error('取得貼紙庫存失敗:', error)
    }
  }

  const fetchFoodInventory = async () => {
    try {
      const res = await fetch('/api/pet/food/inventory')
      if (res.ok) {
        const data = await res.json()
        setFoodItems(data)
      }
    } catch (error) {
      console.error('取得食物庫存失敗:', error)
    }
  }

  const fetchAccessories = async () => {
    try {
      const res = await fetch('/api/pet/accessories')
      if (res.ok) {
        const data = await res.json()
        setAccessories(data)
      }
    } catch (error) {
      console.error('取得配件失敗:', error)
    }
  }

  const fetchAccessoryInventory = async () => {
    try {
      const res = await fetch('/api/pet/accessories/inventory')
      if (res.ok) {
        const data = await res.json()
        setAvailableAccessories(data)
      }
    } catch (error) {
      console.error('取得配件庫存失敗:', error)
    }
  }

  const handleTransactionAdded = () => {
    fetchPet()
    fetchStickers()
    fetchStickerInventory()
    fetchFoodInventory()
    setIsDialogOpen(false)
  }

  const handleStickerPlaced = () => {
    fetchStickers()
    fetchStickerInventory()
  }

  const handlePetFed = () => {
    fetchPet()
    fetchFoodInventory()
  }

  const renderStatCard = (label: string, value: number | undefined) => {
    const percentage = value ?? 0
    const normalized = Math.min(Math.max(percentage, 0), 100)
    const color =
      normalized < 30 ? '#c0392b' : normalized < 50 ? '#f39c12' : '#0f172a'
    return (
      <div className="bg-white border-2 border-black px-4 py-2 min-w-[220px]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-black/60 uppercase tracking-wide">{label}</span>
          <span className="text-lg font-bold text-black">{normalized}%</span>
        </div>
        <div
          className="relative w-full h-4 border-2 border-black overflow-hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 6px, transparent 6px 12px)',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
            style={{
              width: `${normalized}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
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
          
          <div className="flex gap-3 pointer-events-auto">
            {renderStatCard('Mood', pet?.mood)}
            {renderStatCard('Fullness', pet?.fullness)}
            {renderStatCard('Health', pet?.health)}
          </div>

          {/* Warning banner - separate if needed */}
          {pet?.needsAttention && (
            <div className="bg-red-100 border-2 border-red-500 px-2 py-1 pointer-events-auto">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wide">
                ⚠️ {pet.daysSinceInteraction || 0} day{pet.daysSinceInteraction !== 1 ? 's' : ''} since last interaction!
              </div>
            </div>
          )}
        </div>

        {/* 右側：倉庫按鈕 */}
        <div className="pointer-events-auto">
          <button
            onClick={() => {
              const newState = !showEditPanel
              setShowEditPanel(newState)
            }}
            className={`border-2 border-black p-2 lg:p-3 transition-all shadow-lg ${
              showEditPanel 
                ? 'bg-black text-white animate-pulse' 
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
            aria-label="開啟倉庫"
            title={showEditPanel ? '倉庫 (點擊關閉)' : '開啟倉庫'}
          >
            <Package className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>
      </div>

      {/* 主內容區 - 房間顯示 */}
      <main className="flex-1 flex items-start justify-start px-4 pb-20 pt-24 gap-4">
        <Room
          pet={pet}
          stickers={stickers}
          availableStickers={availableStickers}
          foodItems={foodItems}
          accessories={accessories}
          availableAccessories={availableAccessories}
          showEditPanel={showEditPanel}
          onEditPanelChange={setShowEditPanel}
          onStickerPlaced={handleStickerPlaced}
          onPetFed={handlePetFed}
          onAccessoryPlaced={() => {
            fetchAccessories()
            fetchAccessoryInventory()
          }}
        />
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

