'use client'

import { useEffect, useState, useRef } from 'react'
import Navigation from '@/components/dashboard/Navigation'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'
import FeedPanel from './FeedPanel'
import DecorPanel from './DecorPanel'
import PetStatusHUD from './PetStatusHUD'
import PetActionBar from './PetActionBar'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  facingDirection?: string
  points: number
  fullness: number
  mood: number
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

export default function PetRoomContent() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [pet, setPet] = useState<Pet | null>(null)
  const [stickers, setStickers] = useState<RoomSticker[]>([])
  const [availableStickers, setAvailableStickers] = useState<AvailableSticker[]>([])
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [accessories, setAccessories] = useState<PetAccessory[]>([])
  const [availableAccessories, setAvailableAccessories] = useState<AvailableAccessory[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Panel states
  const [showFeedPanel, setShowFeedPanel] = useState(false)
  const [showDecorPanel, setShowDecorPanel] = useState(false)
  
  // Animation states
  const [feedingAnimation, setFeedingAnimation] = useState<{
    active: boolean
    emoji: string
    from: { x: number; y: number }
    to: { x: number; y: number }
  } | null>(null)
  const [petState, setPetState] = useState<'idle' | 'happy' | 'eating'>('idle')
  const [particles, setParticles] = useState<Array<{
    id: string
    emoji: string
    x: number
    y: number
    vx: number
    vy: number
    life: number
  }>>([])
  const petImageRef = useRef<HTMLDivElement>(null)
  const particleCounterRef = useRef(0)
  
  // Pet name editing state
  const [isEditingName, setIsEditingName] = useState(false)
  const [petNameInput, setPetNameInput] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

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
      setPetNameInput(petData.name || '我的寵物')
      
      // Extract food items from purchases (including custom stickers with food category)
      const purchases = petData.purchases || []
      const foodPurchases = purchases.filter((p: any) => 
        p.itemId.startsWith('food') || 
        p.itemId === 'water' ||
        p.category === 'food' // Include custom stickers with food category
      )
      
      // Fetch custom stickers for food items (both own and public)
      const customFoodItemIds = foodPurchases
        .filter((p: any) => p.itemId.startsWith('custom-'))
        .map((p: any) => p.itemId.replace('custom-', ''))
      
      let customStickersMap = new Map<string, { imageUrl: string }>()
      if (customFoodItemIds.length > 0) {
        try {
          // Fetch own custom stickers
          const customStickersRes = await fetch('/api/custom-stickers')
          if (customStickersRes.ok) {
            const customStickers = await customStickersRes.json()
            customStickers.forEach((cs: any) => {
              if (customFoodItemIds.includes(cs.id)) {
                customStickersMap.set(`custom-${cs.id}`, { imageUrl: cs.imageUrl })
              }
            })
          }
          
          // Fetch public custom stickers (for purchased public stickers)
          const publicStickersRes = await fetch('/api/custom-stickers/public')
          if (publicStickersRes.ok) {
            const publicStickers = await publicStickersRes.json()
            publicStickers.forEach((ps: any) => {
              if (customFoodItemIds.includes(ps.id) && !customStickersMap.has(`custom-${ps.id}`)) {
                customStickersMap.set(`custom-${ps.id}`, { imageUrl: ps.imageUrl })
              }
            })
          }
        } catch (error) {
          console.error('Failed to fetch custom stickers:', error)
        }
      }
      
      const foodMap = new Map<string, FoodItem>()
      foodPurchases.forEach((p: any) => {
        const existing = foodMap.get(p.itemId)
        if (existing) {
          existing.count += p.quantity
        } else {
          // For custom stickers, use 🖼️ emoji and get imageUrl, otherwise use getItemEmoji
          const isCustom = p.itemId.startsWith('custom-')
          const emoji = isCustom ? '🖼️' : getItemEmoji(p.itemId)
          const customSticker = isCustom ? customStickersMap.get(p.itemId) : null
          
          foodMap.set(p.itemId, {
            itemId: p.itemId,
            name: p.itemName,
            emoji: emoji,
            count: p.quantity,
            imageUrl: customSticker?.imageUrl || null,
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
        title: 'Failed to Load',
        description: 'Unable to load pet data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartEditName = () => {
    if (pet) {
      setPetNameInput(pet.name)
      setIsEditingName(true)
    }
  }

  const handleCancelEditName = () => {
    if (pet) {
      setPetNameInput(pet.name)
    }
    setIsEditingName(false)
  }

  const handleSaveName = async () => {
    if (!pet) return
    
    const trimmedName = petNameInput.trim()
    if (!trimmedName) {
      toast({
        title: '名稱不能為空',
        description: '請輸入寵物名稱',
        variant: 'destructive',
      })
      return
    }

    if (trimmedName === pet.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    try {
      const response = await fetch('/api/pet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error('更新失敗')
      }

      const updatedPet = await response.json()
      setPet(updatedPet)
      setIsEditingName(false)

      toast({
        title: '名稱已更新',
        description: `寵物名稱已更改為「${trimmedName}」`,
      })
    } catch (error: any) {
      console.error('更新名稱錯誤:', error)
      toast({
        title: '更新失敗',
        description: error.message || '請重試',
        variant: 'destructive',
      })
    } finally {
      setIsSavingName(false)
    }
  }

  const getItemEmoji = (itemId: string): string => {
    // 優先從 SHOP_ITEM_MAP 獲取 emoji
    const shopItem = SHOP_ITEM_MAP[itemId]
    if (shopItem) {
      return shopItem.emoji
    }
    
    // 如果不在 SHOP_ITEM_MAP 中，使用備用 emoji
    const fallbackEmojiMap: Record<string, string> = {
      water: '💧',
      cat: '🐱',
    }
    return fallbackEmojiMap[itemId] || '⬛'
  }

  // Show particle effect
  const showParticleEffect = (emoji: string, count: number) => {
    if (!petImageRef.current) return
    
    const rect = petImageRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const newParticles = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count
      const speed = 2 + Math.random() * 2
      particleCounterRef.current += 1
      return {
        id: `particle-${Date.now()}-${particleCounterRef.current}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        emoji,
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1.0
      }
    })
    
    setParticles(prev => [...prev, ...newParticles])
    
    // Animate particles
    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.015,
          vy: p.vy + 0.15 // gravity
        })).filter(p => p.life > 0)
        
        if (updated.length > 0) {
          requestAnimationFrame(animate)
        }
        return updated
      })
    }
    
    requestAnimationFrame(animate)
  }

  // Handle pet click
  const handlePetClick = () => {
    setPetState('happy')
    showParticleEffect('❤️', 3)
    setTimeout(() => setPetState('idle'), 600)
  }

  // Handle feed pet
  const handleFeedPet = async (itemId: string) => {
    const food = foodItems.find(f => f.itemId === itemId)
    if (!food || !petImageRef.current) return

    // Get panel and pet positions for animation
    const panelElement = document.querySelector('[data-feed-panel]') as HTMLElement
    const petRect = petImageRef.current.getBoundingClientRect()
    
    const fromX = panelElement 
      ? panelElement.getBoundingClientRect().left + panelElement.getBoundingClientRect().width / 2
      : 200
    const fromY = panelElement
      ? panelElement.getBoundingClientRect().top + panelElement.getBoundingClientRect().height / 2
      : 200
    
    const toX = petRect.left + petRect.width / 2
    const toY = petRect.top + petRect.height / 2

    // Start feeding animation
    setFeedingAnimation({
      active: true,
      emoji: food.emoji,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    })

    // Set pet to eating state
    setPetState('eating')

    try {
      const res = await fetch('/api/pet/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) throw new Error('Failed to feed')
      const data = await res.json()
      
      // Show success effects
      setTimeout(() => {
        showParticleEffect('❤️', 5)
        showParticleEffect('⭐', 3)
      }, 600)
      
      toast({
        title: '餵食成功！',
        description: `飽食度 +${data.fullnessGain}`,
      })
      
      // Reset states
      setTimeout(() => {
        setFeedingAnimation(null)
        setPetState('idle')
      }, 1200)
      
      // Update pet data without triggering full refresh
      setTimeout(async () => {
        try {
          const petRes = await fetch('/api/pet')
          const petData = await petRes.json()
          setPet(petData)
          
          // Update food items count (including custom stickers with food category)
          const purchases = petData.purchases || []
          const foodPurchases = purchases.filter((p: any) => 
            p.itemId.startsWith('food') || 
            p.itemId === 'water' ||
            p.category === 'food' // Include custom stickers with food category
          )
          
          // Fetch custom stickers for food items (both own and public)
          const customFoodItemIds = foodPurchases
            .filter((p: any) => p.itemId.startsWith('custom-'))
            .map((p: any) => p.itemId.replace('custom-', ''))
          
          let customStickersMap = new Map<string, { imageUrl: string }>()
          if (customFoodItemIds.length > 0) {
            try {
              // Fetch own custom stickers
              const customStickersRes = await fetch('/api/custom-stickers')
              if (customStickersRes.ok) {
                const customStickers = await customStickersRes.json()
                customStickers.forEach((cs: any) => {
                  if (customFoodItemIds.includes(cs.id)) {
                    customStickersMap.set(`custom-${cs.id}`, { imageUrl: cs.imageUrl })
                  }
                })
              }
              
              // Fetch public custom stickers (for purchased public stickers)
              const publicStickersRes = await fetch('/api/custom-stickers/public')
              if (publicStickersRes.ok) {
                const publicStickers = await publicStickersRes.json()
                publicStickers.forEach((ps: any) => {
                  if (customFoodItemIds.includes(ps.id) && !customStickersMap.has(`custom-${ps.id}`)) {
                    customStickersMap.set(`custom-${ps.id}`, { imageUrl: ps.imageUrl })
                  }
                })
              }
            } catch (error) {
              console.error('Failed to fetch custom stickers:', error)
            }
          }
          
          const foodMap = new Map<string, FoodItem>()
          foodPurchases.forEach((p: any) => {
            const existing = foodMap.get(p.itemId)
            if (existing) {
              existing.count += p.quantity
            } else {
              // For custom stickers, use 🖼️ emoji and get imageUrl, otherwise use getItemEmoji
              const isCustom = p.itemId.startsWith('custom-')
              const emoji = isCustom ? '🖼️' : getItemEmoji(p.itemId)
              const customSticker = isCustom ? customStickersMap.get(p.itemId) : null
              
              foodMap.set(p.itemId, {
                itemId: p.itemId,
                name: p.itemName,
                emoji: emoji,
                count: p.quantity,
                imageUrl: customSticker?.imageUrl || null,
              })
            }
          })
          setFoodItems(Array.from(foodMap.values()))
        } catch (error) {
          console.error('Failed to update pet data:', error)
        }
      }, 1300)
    } catch (error: any) {
      setFeedingAnimation(null)
      setPetState('idle')
      toast({
        title: '餵食失敗',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  // Handle accessory drop
  const handleAccessoryDrop = async (accessoryId: string, positionX: number, positionY: number) => {
    try {
      const res = await fetch('/api/pet/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessoryId,
          positionX,
          positionY,
          rotation: 0,
          scale: 1,
        }),
      })

      if (!res.ok) throw new Error('Failed to equip')
      toast({
        title: '裝備成功！',
        description: '成功為寵物添加配件',
      })
      showParticleEffect('✨', 4)
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast({
        title: '裝備失敗',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  // Handle accessory delete
  const handleAccessoryDelete = async (accessoryId: string) => {
    try {
      const res = await fetch(`/api/pet/accessories/${accessoryId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove accessory')
      toast({ title: '已移除配件' })
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast({
        title: '移除失敗',
        description: error.message,
        variant: 'destructive',
      })
    }
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
    <div className="h-screen bg-white flex flex-col overflow-hidden relative pb-20">
      {/* Background layer - above navbar but below content */}
      <div 
        className="fixed top-0 left-0 right-0 bottom-20 bg-cover bg-center bg-no-repeat z-40"
        style={{
          backgroundImage: 'url(/pet_background.png)',
        }}
      />
      
      {/* Main Content with Container */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 pt-4 pb-24 flex flex-col relative z-50">
        {/* Pet Name Editor - Above HUD */}
        <div className="mb-8 mt-8 flex justify-center flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-300 shadow-sm px-4 py-2">
            {isEditingName ? (
              <>
                <Input
                  value={petNameInput}
                  onChange={(e) => setPetNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName()
                    } else if (e.key === 'Escape') {
                      handleCancelEditName()
                    }
                  }}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 text-center min-w-[120px] max-w-[200px]"
                  autoFocus
                  maxLength={20}
                  disabled={isSavingName}
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                  title="儲存"
                >
                  <Check className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  onClick={handleCancelEditName}
                  disabled={isSavingName}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                  title="取消"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </>
            ) : (
              <>
                <span className="px-2 py-1 text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                  {pet.name}
                </span>
                <button
                  onClick={handleStartEditName}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="編輯名稱"
                >
                  <Pencil className="h-4 w-4 text-gray-700" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status HUD */}
        <div className="mb-0 flex justify-center flex-shrink-0">
          <PetStatusHUD
            mood={pet.mood}
            fullness={pet.fullness}
          />
        </div>

        {/* Pet Display Container - Vertical Portrait Style */}
        <div className="flex-1 flex items-center justify-center min-h-0 mb-6">
          <div className="relative w-full max-w-md h-full flex items-center justify-center">
            {/* Pet container - aligned to circle in background, positioned lower */}
            <div
              ref={petImageRef}
              className="relative w-[350px] h-[350px] max-w-[350px] max-h-[350px] min-w-[250px] min-h-[250px] flex items-center justify-center translate-y-8"
              style={{
                width: 'clamp(250px, 70%, 350px)',
                height: 'clamp(250px, 70%, 350px)',
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={async (e) => {
                e.preventDefault()
                const data = e.dataTransfer.getData('application/json')
                if (!data) return

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'accessory' && parsed.accessoryId) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const positionX = (e.clientX - rect.left) / rect.width
                    const positionY = (e.clientY - rect.top) / rect.height

                    const clampedX = Math.min(Math.max(positionX, 0), 1)
                    const clampedY = Math.min(Math.max(positionY, 0), 1)

                    await handleAccessoryDrop(parsed.accessoryId, clampedX, clampedY)
                  }
                } catch (error: any) {
                  toast({
                    title: '裝備失敗',
                    description: error.message,
                    variant: 'destructive',
                  })
                }
              }}
            >
                {/* Pet Image */}
                <img
                  src={pet.imageUrl || '/cat.png'}
                  alt={pet.name}
                  className={`w-full h-full object-contain cursor-pointer transition-all duration-300 ${
                    petState === 'happy' ? 'animate-pet-happy' :
                    petState === 'eating' ? 'animate-pet-eating' :
                    'hover:scale-105'
                  }`}
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  onClick={handlePetClick}
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
                    onClick={() => handleAccessoryDelete(accessory.id)}
                    title="點擊移除配件"
                  >
                    {accessory.imageUrl ? (
                      <img
                        src={accessory.imageUrl}
                        alt="Accessory"
                        className="max-w-[48px] max-h-[48px] lg:max-w-[64px] lg:max-h-[64px] object-contain"
                      />
                    ) : (
                      <span className="text-3xl lg:text-4xl">
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
        </div>

        {/* Action Bar - Inside Container */}
        <div className="flex justify-center flex-shrink-0">
          <PetActionBar
            onFeedClick={() => {
              if (showFeedPanel) {
                setShowFeedPanel(false)
              } else {
                setShowFeedPanel(true)
                setShowDecorPanel(false) // Close decor panel if open
              }
            }}
            onDecorClick={() => {
              if (showDecorPanel) {
                setShowDecorPanel(false)
              } else {
                setShowDecorPanel(true)
                setShowFeedPanel(false) // Close feed panel if open
              }
            }}
          />
        </div>
      </div>

      {/* Feeding Animation */}
      {feedingAnimation && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${feedingAnimation.from.x}px`,
            top: `${feedingAnimation.from.y}px`,
            '--target-x': `${feedingAnimation.to.x - feedingAnimation.from.x}px`,
            '--target-y': `${feedingAnimation.to.y - feedingAnimation.from.y}px`,
          } as React.CSSProperties & { '--target-x': string; '--target-y': string }}
        >
          <span className="text-4xl animate-fly-to-pet block">{feedingAnimation.emoji}</span>
        </div>
      )}

      {/* Particle Effects */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            transform: 'translate(-50%, -50%)',
            opacity: particle.life,
            fontSize: `${20 + particle.life * 20}px`,
          }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* Feed Panel - Slides from left */}
      <FeedPanel
        isOpen={showFeedPanel}
        onClose={() => setShowFeedPanel(false)}
        foodItems={foodItems}
        onFeedPet={handleFeedPet}
      />

      {/* Decor Panel - Slides from right */}
      <DecorPanel
        isOpen={showDecorPanel}
        onClose={() => setShowDecorPanel(false)}
        availableAccessories={availableAccessories}
        onDragAccessory={(accessoryId, e) => {
          const dragData = { type: 'accessory', accessoryId }
          e.dataTransfer.setData('application/json', JSON.stringify(dragData))
          e.dataTransfer.effectAllowed = 'copy'
        }}
      />


      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}
