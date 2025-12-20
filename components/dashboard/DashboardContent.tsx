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
import ChatInput from '@/components/chat/ChatInput'
import PetChatBubble from '@/components/chat/PetChatBubble'

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
  const [chatBubbles, setChatBubbles] = useState<Array<{ id: string; message: string; position: { x: number; y: number } }>>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [transactionInitialValues, setTransactionInitialValues] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
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

  // 合併所有 dashboard 資料請求為單一 API 調用
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard-data', {
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await res.json()
      
      // 設置所有狀態
      setUserBalance(data.userBalance || 0)
      setPet(data.pet)
      setStickers(data.stickers || [])
      setAvailableStickers(data.stickerInventory || [])
      setFoodItems(data.foodInventory || [])
      setAccessories(data.accessories || [])
      setAvailableAccessories(data.accessoryInventory || [])
      setHasUnclaimedMissions(data.hasUnclaimedMissions || false)
      
      // 檢查是否有任務完成信息
      if (data.pet?.missionCompleted) {
        window.dispatchEvent(new CustomEvent('missionCompleted', { detail: data.pet.missionCompleted }))
      }
    } catch (error) {
      console.error('取得 dashboard 資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 刷新 dashboard 資料（用於交易後更新）
  const refreshDashboardData = async () => {
    await fetchDashboardData()
  }

  const handleTransactionAdded = async (transactionDetails?: { amount: number; type: string; categoryName: string; note?: string }) => {
    console.log('記帳完成，開始更新資料...', transactionDetails)
    setIsDialogOpen(false)
    setTransactionInitialValues(null)
    
    // Show pet response for the transaction - do this BEFORE other updates
    if (transactionDetails) {
      console.log('📝 Transaction completed, getting pet response for:', transactionDetails)
      try {
        // Create a message for the pet based on transaction
        const typeText = transactionDetails.type === 'EXPENSE' ? '支出' : '收入'
        const message = `我剛剛記錄了一筆${typeText}：${transactionDetails.amount}元，分類是${transactionDetails.categoryName}`
        
        console.log('💬 Sending message to pet:', message)
        
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        })

        if (res.ok) {
          const data = await res.json()
          console.log('✅ Pet response received:', data)
          if (data.message) {
            const bubbleId = `bubble-${Date.now()}-${Math.random()}`
            // Position bubble near the pet (center-left of screen, above pet area)
            const position = { x: 30, y: 25 }
            console.log('💭 Adding chat bubble:', bubbleId, data.message, 'at position:', position)
            setChatBubbles((prev) => {
              const newBubbles = [...prev, { id: bubbleId, message: data.message, position }]
              console.log('📊 Current bubbles:', newBubbles.length, newBubbles)
              return newBubbles
            })

            // Remove bubble after 15 seconds
            setTimeout(() => {
              setChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId))
            }, 15000)
          } else {
            console.warn('⚠️ No message in pet response')
          }
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('❌ Failed to get pet response, status:', res.status, errorData)
        }
      } catch (error) {
        console.error('❌ Failed to get pet response:', error)
      }
    } else {
      console.warn('⚠️ No transaction details provided to handleTransactionAdded')
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
    await refreshDashboardData()
  }

  const handleChatSend = async (message: string) => {
    setIsChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()

      // Check if there's an error in the response
      if (!res.ok || data.error) {
        const errorMessage = data.error || data.message || 'Chat request failed'
        console.error('Chat API error:', errorMessage, data)
        toast({
          title: '錯誤',
          description: errorMessage || '無法發送訊息，請稍後再試',
          variant: 'destructive',
        })
        return
      }

      // Show pet response as chat bubble
      if (data.message) {
        const bubbleId = `bubble-${Date.now()}-${Math.random()}`
        const position = { x: 50, y: 30 } // Position near pet's head (center-top of room)
        setChatBubbles((prev) => [...prev, { id: bubbleId, message: data.message, position }])

        // Remove bubble after 15 seconds (longer duration for better readability)
        setTimeout(() => {
          setChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId))
        }, 15000)
      }

      // If it's a transaction, open the dialog with pre-filled data
      if (data.isTransaction && data.transactionData) {
        const transactionData = data.transactionData
        console.log('Transaction detected:', transactionData)
        
        // Format the transaction data for the dialog
        const initialValues: any = {
          amount: transactionData.amount,
          type: transactionData.type,
          categoryName: transactionData.categoryName,
        }
        
        if (transactionData.date) {
          initialValues.date = transactionData.date
        }
        
        if (transactionData.note) {
          initialValues.note = transactionData.note
        }
        
        setTransactionInitialValues(initialValues)
        setIsDialogOpen(true)
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage = error?.message || '無法發送訊息，請稍後再試'
      toast({
        title: '錯誤',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsChatLoading(false)
    }
  }

  const removeChatBubble = (id: string) => {
    setChatBubbles((prev) => prev.filter((b) => b.id !== id))
  }

  const handleStickerPlaced = () => {
    refreshDashboardData()
  }

  const handlePetFed = () => {
    refreshDashboardData()
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
              setShowMissionsDialog(!showMissionsDialog)
            }}
            className="bg-white/90 backdrop-blur-sm rounded-lg border border-black/20 w-16 h-18 flex items-center justify-center shadow-sm hover:bg-black/5 transition-colors relative"
            aria-label="View Missions"
            title="Missions"
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
            aria-label="Open Inventory"
            title={showEditPanel ? 'Inventory (Click to close)' : 'Open Inventory'}
          >
            <Package className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>
      </div>

      {/* 左側任務邊欄 */}
      {showMissionsDialog && (
        <div className="fixed left-4 top-20 bottom-24 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-black/20 shadow-xl z-40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-black/20 flex items-center justify-between">
            <h2 className="text-lg font-bold text-black uppercase tracking-wide">Missions</h2>
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
      <main className="flex-1 flex items-start justify-start px-4 pb-20 pt-24 gap-4 relative">
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
            refreshDashboardData()
          }}
        />
        {/* 寵物聊天氣泡 */}
        {chatBubbles.map((bubble) => (
          <PetChatBubble
            key={bubble.id}
            message={bubble.message}
            position={bubble.position}
            onClose={() => removeChatBubble(bubble.id)}
            duration={15000}
          />
        ))}
      </main>

      {/* 記帳對話框 */}
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setTransactionInitialValues(null)
          }
        }}
        onSuccess={handleTransactionAdded}
        initialValues={transactionInitialValues}
      />

      {/* 底部導航 */}
      <Navigation />

      {/* 聊天輸入框和新增記帳按鈕 - 固定在底部導航上方 */}
      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {/* 聊天輸入框 - 長條形，佔據左側空間 */}
          <div className="flex-1">
            <ChatInput onSend={handleChatSend} disabled={isChatLoading} />
          </div>
          {/* 新增記帳按鈕 - 固定在右側 */}
          <Button
            size="icon"
            onClick={() => {
              setTransactionInitialValues(null)
              setIsDialogOpen(true)
            }}
            className="w-14 h-14 rounded-full bg-black text-white hover:bg-black/80 shadow-lg flex-shrink-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}

