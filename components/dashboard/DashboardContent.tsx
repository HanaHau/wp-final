'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Room from '@/components/pet/Room'
import TransactionDialog from '@/components/transaction/TransactionDialog'
import MissionsPanel from '@/components/missions/MissionsPanel'
import Navigation from './Navigation'
import { Plus, Package, ListChecks } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  needsAttention?: boolean
  isSick?: boolean
  isUnhappy?: boolean
  isHungry?: boolean
  daysSinceInteraction?: number
}

interface Mission {
  type: 'daily' | 'weekly'
  missionId: string
  name: string
  points: number
  progress: number
  target: number
  completed: boolean
  claimed?: boolean
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
  imageUrl?: string | null // For custom stickers
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

interface AvailableAccessory {
  accessoryId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string | null
}

export default function DashboardContent() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [pet, setPet] = useState<Pet | null>(null)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [stickers, setStickers] = useState<RoomSticker[]>([])
  const [availableStickers, setAvailableStickers] = useState<AvailableSticker[]>([])
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [accessories, setAccessories] = useState<PetAccessory[]>([])
  const [availableAccessories, setAvailableAccessories] = useState<AvailableAccessory[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [showMissionsDialog, setShowMissionsDialog] = useState(false)
  const [hasUnclaimedMissions, setHasUnclaimedMissions] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchPet()
    fetchStickers()
    fetchStickerInventory()
    fetchFoodInventory()
    fetchAccessories()
    fetchAccessoryInventory()
    checkUnclaimedMissions()
  }, [])

  // Listen for mission updates to refresh unclaimed missions indicator
  useEffect(() => {
    const handleMissionUpdate = () => {
      checkUnclaimedMissions()
    }
    
    window.addEventListener('missionClaimed', handleMissionUpdate)
    window.addEventListener('missionCompleted', handleMissionUpdate)
    window.addEventListener('refreshMissions', handleMissionUpdate)
    
    return () => {
      window.removeEventListener('missionClaimed', handleMissionUpdate)
      window.removeEventListener('missionCompleted', handleMissionUpdate)
      window.removeEventListener('refreshMissions', handleMissionUpdate)
    }
  }, [])

  // Listen for mission reward claimed event to update points immediately
  useEffect(() => {
    const handleMissionRewardClaimed = (event: CustomEvent<{ points: number }>) => {
      const { points } = event.detail
      // 立即更新主畫面的points顯示，不需要刷新頁面
      if (pet) {
        setPet({
          ...pet,
          points: pet.points + points,
        })
      }
    }
    
    window.addEventListener('missionRewardClaimed', handleMissionRewardClaimed as EventListener)
    
    return () => {
      window.removeEventListener('missionRewardClaimed', handleMissionRewardClaimed as EventListener)
    }
  }, [pet])

  const checkUnclaimedMissions = async () => {
    try {
      const res = await fetch('/api/missions/completed')
      if (res.ok) {
        const data = await res.json()
        const missions = data.missions || []
        setHasUnclaimedMissions(missions.length > 0)
      }
    } catch (error) {
      console.error('檢查未領取任務失敗:', error)
    }
  }


  // 當打開倉庫時，自動進入編輯模式（通過 Room 組件內部處理）

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user', {
        cache: 'no-store', // 確保不從緩存獲取
      })
      if (res.ok) {
        const data = await res.json()
        console.log('更新餘額:', data.balance)
        setUserBalance(data.balance || 0)
      } else {
        console.error('取得使用者資訊失敗:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('取得使用者資訊失敗:', error)
    }
  }

  const fetchPet = async () => {
    try {
      const res = await fetch('/api/pet')
      const data = await res.json()
      setPet(data)
      
      // 檢查 API 響應中是否有任務完成信息
      if (data.missionCompleted) {
        // Dispatch 全局事件，讓 MissionToastManager 處理顯示
        window.dispatchEvent(new CustomEvent('missionCompleted', { detail: data.missionCompleted }))
      }
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

  const handleTransactionAdded = async () => {
    console.log('記帳完成，開始更新資料...')
    setIsDialogOpen(false)
    await new Promise(resolve => setTimeout(resolve, 100))
    await fetchUser()
    fetchPet()
    fetchStickers()
    fetchStickerInventory()
    fetchFoodInventory()
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
    const isWarning = normalized < 20
    const color = isWarning ? '#dc2626' : normalized < 30 ? '#c0392b' : normalized < 50 ? '#f39c12' : '#0f172a'
    
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl border ${isWarning ? 'border-red-500' : 'border-black/20'} px-4 py-2 min-w-[220px] shadow-sm`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs uppercase tracking-wide ${isWarning ? 'text-red-600 font-bold' : 'text-black/60'}`}>
            {label} {isWarning && '⚠️ Warning'}
          </span>
          <span className={`text-lg font-bold ${isWarning ? 'text-red-600' : 'text-black'}`}>{normalized}%</span>
        </div>
        <div
          className={`relative w-full h-4 rounded-lg border ${isWarning ? 'border-red-500' : 'border-black/20'} overflow-hidden`}
          style={{
            backgroundImage: isWarning 
              ? 'repeating-linear-gradient(135deg, rgba(220,38,38,0.15) 0 6px, transparent 6px 12px)'
              : 'repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 6px, transparent 6px 12px)',
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
        <div className="text-sm text-black/60 uppercase tracking-wide">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* 頂部資訊欄 - 極簡設計 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-start p-4 pointer-events-none">
        {/* 左側：資源顯示 */}
        <div className="flex gap-3 pointer-events-auto">
          {/* 任務按鈕 */}
          <button
            onClick={() => {
              setShowMissionsDialog(true)
            }}
            className="bg-white/90 backdrop-blur-sm rounded-lg border border-black/20 w-16 h-18 flex items-center justify-center shadow-sm hover:bg-black/5 transition-colors relative"
            aria-label="查看任務"
            title="任務"
          >
            <ListChecks className="h-5 w-5 text-black" />
            {hasUnclaimedMissions && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
            )}
          </button>
          {/* 餘額 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 px-3 py-2 shadow-sm">
            <div className="text-xs text-black/60 uppercase tracking-wide">Balance</div>
            <div className={`text-lg font-bold ${userBalance < 0 ? 'text-red-600' : 'text-black'}`}>
              ${userBalance.toLocaleString()}
            </div>
          </div>
          {/* 點數 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-black/20 px-3 py-2 shadow-sm">
            <div className="text-xs text-black/60 uppercase tracking-wide">Points</div>
            <div className="text-lg font-bold text-black">{pet?.points || 0}</div>
          </div>
          
          <div className="flex gap-3 pointer-events-auto">
            {renderStatCard('Mood', pet?.mood)}
            {renderStatCard('Fullness', pet?.fullness)}
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
            className={`rounded-xl border border-black/20 p-2 lg:p-3 transition-all shadow-lg ${
              showEditPanel 
                ? 'bg-black text-white animate-pulse' 
                : 'bg-white/90 backdrop-blur-sm text-black hover:bg-black/5'
            }`}
            aria-label="開啟倉庫"
            title={showEditPanel ? '倉庫 (點擊關閉)' : '開啟倉庫'}
          >
            <Package className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>
      </div>

      {/* 左側任務邊欄 */}
      {showMissionsDialog && (
        <div className="fixed left-4 top-20 bottom-24 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-black/20 shadow-xl z-40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-black/20 flex items-center justify-between">
            <h2 className="text-lg font-bold text-black uppercase tracking-wide">任務</h2>
            <button
              onClick={() => {
                setShowMissionsDialog(false)
              }}
              className="w-6 h-6 flex items-center justify-center hover:bg-black/5 rounded transition-colors"
            >
              <span className="text-black/60 text-xl leading-none">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <MissionsPanel />
          </div>
        </div>
      )}

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

      {/* 新增記帳按鈕 - 固定在底部，黑色，一直顯示 */}
      <div className="fixed bottom-24 right-4 z-30">
        <Button
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          className="w-14 h-14 rounded-full bg-black text-white hover:bg-black/80 shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

