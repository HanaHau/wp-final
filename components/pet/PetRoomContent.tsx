'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/dashboard/Navigation'
import Room from './Room'
import PetInteraction from './PetInteraction'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

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
  imageUrl?: string | null
}

interface AvailableSticker {
  stickerId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string
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

interface AvailableAccessory {
  accessoryId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string | null
}

export default function PetRoomContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [pet, setPet] = useState<Pet | null>(null)
  const [stickers, setStickers] = useState<RoomSticker[]>([])
  const [availableStickers, setAvailableStickers] = useState<AvailableSticker[]>([])
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [accessories, setAccessories] = useState<PetAccessory[]>([])
  const [availableAccessories, setAvailableAccessories] = useState<AvailableAccessory[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'food' | 'accessories'>('food')

  useEffect(() => {
    fetchAllData()
  }, [refreshKey])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch pet data
      const petRes = await fetch('/api/pet')
      const petData = await petRes.json()
      setPet(petData)
      
      // Extract food items from purchases
      const purchases = petData.purchases || []
      const foodPurchases = purchases.filter((p: any) => 
        p.itemId.startsWith('food') || p.itemId === 'water'
      )
      
      const foodMap = new Map<string, FoodItem>()
      foodPurchases.forEach((p: any) => {
        const existing = foodMap.get(p.itemId)
        if (existing) {
          existing.count += p.quantity
        } else {
          foodMap.set(p.itemId, {
            itemId: p.itemId,
            name: p.itemName,
            emoji: getItemEmoji(p.itemId),
            count: p.quantity,
          })
        }
      })
      setFoodItems(Array.from(foodMap.values()))

      // Fetch stickers
      const stickersRes = await fetch('/api/pet/stickers')
      let stickersData: any[] = []
      if (stickersRes.ok) {
        stickersData = await stickersRes.json()
        setStickers(stickersData)
      }

      // Fetch available stickers from purchases
      const stickerPurchases = purchases.filter((p: any) => 
        p.itemId.startsWith('sticker') || p.itemId === 'cat'
      )
      const stickerMap = new Map<string, AvailableSticker>()
      stickerPurchases.forEach((p: any) => {
        const existing = stickerMap.get(p.itemId)
        const usedCount = stickersData.filter((s: any) => s.stickerId === p.itemId).length
        const availableCount = p.quantity - usedCount
        
        if (availableCount > 0) {
          stickerMap.set(p.itemId, {
            stickerId: p.itemId,
            name: p.itemName,
            emoji: getItemEmoji(p.itemId),
            count: availableCount,
          })
        }
      })
      setAvailableStickers(Array.from(stickerMap.values()))

      // Fetch accessories
      const accessoriesRes = await fetch('/api/pet/accessories')
      let accessoriesData: any[] = []
      if (accessoriesRes.ok) {
        accessoriesData = await accessoriesRes.json()
        setAccessories(accessoriesData)
      }

      // Fetch available accessories
      const accessoryPurchases = purchases.filter((p: any) => 
        p.itemId.startsWith('acc')
      )
      const accessoryMap = new Map<string, AvailableAccessory>()
      accessoryPurchases.forEach((p: any) => {
        const existing = accessoryMap.get(p.itemId)
        const usedCount = accessoriesData.filter((a: any) => a.accessoryId === p.itemId).length
        const availableCount = p.quantity - usedCount
        
        if (availableCount > 0) {
          accessoryMap.set(p.itemId, {
            accessoryId: p.itemId,
            name: p.itemName,
            emoji: getItemEmoji(p.itemId),
            count: availableCount,
          })
        }
      })
      setAvailableAccessories(Array.from(accessoryMap.values()))

    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast({
        title: '載入失敗',
        description: '無法載入寵物資料',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getItemEmoji = (itemId: string): string => {
    const emojiMap: Record<string, string> = {
      food1: '🍖',
      food2: '🥩',
      food3: '🍗',
      water: '💧',
      sticker1: '🎨',
      sticker2: '🌟',
      sticker3: '🎪',
      cat: '🐱',
      acc1: '🎀',
      acc2: '👑',
    }
    return emojiMap[itemId] || '⬛'
  }

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading || !pet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🐱</div>
          <p className="text-sm uppercase tracking-wide">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navigation />
      
      {/* Header */}
      <div className="border-b-2 border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm uppercase tracking-wide hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <h1 className="text-xl lg:text-2xl font-bold uppercase tracking-wide">
            我的寵物
          </h1>
          <div className="w-16" />
        </div>
        
        {/* Pet Stats */}
        <div className="max-w-7xl mx-auto px-4 py-3 border-t-2 border-black bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            {/* Points */}
            <div className="bg-white border-2 border-black px-3 py-2">
              <div className="text-xs text-black/60 uppercase tracking-wide">Points</div>
              <div className="text-lg font-bold text-black">{pet.points || 0}</div>
            </div>
            
            {/* Mood */}
            <div className="bg-white border-2 border-black px-3 py-2 min-w-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-black/60 uppercase tracking-wide">Mood</span>
                <span className="text-sm font-bold text-black">{Math.min(pet.mood || 0, 100)}%</span>
              </div>
              <div className="relative w-full h-3 border-2 border-black overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(pet.mood || 0, 100)}%`,
                    backgroundColor: '#0f172a',
                  }}
                />
              </div>
            </div>
            
            {/* Fullness */}
            <div className="bg-white border-2 border-black px-3 py-2 min-w-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-black/60 uppercase tracking-wide">Fullness</span>
                <span className="text-sm font-bold text-black">{Math.min(pet.fullness || 0, 100)}%</span>
              </div>
              <div className="relative w-full h-3 border-2 border-black overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(pet.fullness || 0, 100)}%`,
                    backgroundColor: '#0f172a',
                  }}
                />
              </div>
            </div>
            
            {/* Health */}
            <div className="bg-white border-2 border-black px-3 py-2 min-w-[120px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-black/60 uppercase tracking-wide">Health</span>
                <span className="text-sm font-bold text-black">{Math.min(pet.health || 0, 100)}%</span>
              </div>
              <div className="relative w-full h-3 border-2 border-black overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(pet.health || 0, 100)}%`,
                    backgroundColor: '#0f172a',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Pet Display Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="relative w-64 h-64 lg:w-80 lg:h-80">
          {/* Pet Image */}
          <img
            src={pet.imageUrl || '/cat.jpg'}
            alt={pet.name}
            className="w-full h-full object-contain"
          />
          
          {/* Accessories positioned relative to pet */}
          {accessories.map((accessory) => (
            <div
              key={accessory.id}
              className="absolute cursor-pointer hover:scale-110 transition-transform group"
              style={{
                left: `${accessory.positionX * 100}%`,
                top: `${accessory.positionY * 100}%`,
                transform: `translate(-50%, -50%) rotate(${accessory.rotation}deg) scale(${accessory.scale})`,
                zIndex: 10,
              }}
              onClick={async () => {
                try {
                  const res = await fetch(`/api/pet/accessories/${accessory.id}`, {
                    method: 'DELETE',
                  })
                  if (!res.ok) throw new Error('移除配件失敗')
                  toast({ title: '配件已移除' })
                  setRefreshKey(prev => prev + 1)
                } catch (error: any) {
                  toast({
                    title: '移除失敗',
                    description: error.message,
                    variant: 'destructive',
                  })
                }
              }}
              title="點擊移除配件"
            >
              {accessory.imageUrl ? (
                <img
                  src={accessory.imageUrl}
                  alt="Accessory"
                  className="max-w-[32px] max-h-[32px] lg:max-w-[48px] lg:max-h-[48px] object-contain"
                />
              ) : (
                <span className="text-2xl lg:text-3xl">
                  {getItemEmoji(accessory.accessoryId)}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✕</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items Selection Bar - Bottom */}
      <div className="border-t-2 border-black bg-white fixed bottom-0 left-0 right-0 pb-16">
        {/* Tabs */}
        <div className="flex border-b-2 border-black">
          <button
            onClick={() => setActiveTab('food')}
            className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wide border-r-2 border-black transition-colors ${
              activeTab === 'food'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            食物 ({foodItems.reduce((sum, f) => sum + f.count, 0)})
          </button>
          <button
            onClick={() => setActiveTab('accessories')}
            className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'accessories'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            配件 ({availableAccessories.reduce((sum, a) => sum + a.count, 0)})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[200px] overflow-y-auto">
          {activeTab === 'food' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {foodItems.length === 0 ? (
                <p className="col-span-full text-center text-sm text-black/60">
                  尚無食物 - 前往商店購買！
                </p>
              ) : (
                foodItems.map((food) => (
                  <button
                    key={food.itemId}
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/pet/feed', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: food.itemId }),
                        })
                        if (!res.ok) throw new Error('餵食失敗')
                        const data = await res.json()
                        toast({
                          title: '餵食成功！',
                          description: `飽食度 +${data.fullnessGain}`,
                        })
                        setRefreshKey(prev => prev + 1)
                      } catch (error: any) {
                        toast({
                          title: '餵食失敗',
                          description: error.message,
                          variant: 'destructive',
                        })
                      }
                    }}
                    disabled={food.count === 0}
                    className={`aspect-square border-2 border-black p-2 flex flex-col items-center justify-center transition-all ${
                      food.count > 0
                        ? 'hover:bg-black hover:text-white cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl mb-1">{food.emoji}</span>
                    <span className="text-[10px] text-center line-clamp-1">{food.name}</span>
                    <span className="text-[10px] text-black/60">x{food.count}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === 'accessories' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {availableAccessories.length === 0 ? (
                <p className="col-span-full text-center text-sm text-black/60">
                  尚無配件 - 前往商店購買！
                </p>
              ) : (
                availableAccessories.map((accessory) => (
                  <button
                    key={accessory.accessoryId}
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/pet/accessories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            accessoryId: accessory.accessoryId,
                            positionX: 0.5,
                            positionY: 0.5,
                            rotation: 0,
                            scale: 1,
                          }),
                        })
                        if (!res.ok) throw new Error('裝備失敗')
                        toast({
                          title: '配件已裝備！',
                          description: '成功為寵物添加配件',
                        })
                        setRefreshKey(prev => prev + 1)
                      } catch (error: any) {
                        toast({
                          title: '裝備失敗',
                          description: error.message,
                          variant: 'destructive',
                        })
                      }
                    }}
                    disabled={accessory.count === 0}
                    className={`aspect-square border-2 border-black p-2 flex flex-col items-center justify-center transition-all ${
                      accessory.count > 0
                        ? 'hover:bg-black hover:text-white cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    {accessory.imageUrl ? (
                      <img
                        src={accessory.imageUrl}
                        alt={accessory.name}
                        className="w-8 h-8 object-contain mb-1"
                      />
                    ) : (
                      <span className="text-2xl mb-1">{accessory.emoji}</span>
                    )}
                    <span className="text-[10px] text-center line-clamp-1">{accessory.name}</span>
                    <span className="text-[10px] text-black/60">x{accessory.count}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t-2 border-black bg-gray-50">
          <p className="text-xs text-center text-black/60">
            💡 點擊食物餵養寵物 • 點擊配件裝備 • 點擊已裝備的配件可移除
          </p>
        </div>
      </div>
    </div>
  )
}
