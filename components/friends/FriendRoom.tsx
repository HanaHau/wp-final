'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { DoorOpen, Camera, Gift, Utensils, X, Heart, Droplet } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

interface PetAccessory {
  id: string
  accessoryId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  imageUrl?: string | null
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

interface FoodItem {
  itemId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string | null
}

interface FriendRoomProps {
  pet: {
    id: string
    name: string
    imageUrl: string | null
    facingDirection?: string | null
    mood: number
    fullness: number
  }
  user: {
    id: string
    name: string | null
    userID: string | null
  }
  stickers: RoomSticker[]
  accessories: PetAccessory[]
  friendId: string
  onLeave: () => void
}

export default function FriendRoom({ pet, user, stickers, accessories, friendId, onLeave }: FriendRoomProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [petPosition, setPetPosition] = useState({ x: 0.5, y: 0.75 })
  const [isPetting, setIsPetting] = useState(false)
  const [hearts, setHearts] = useState<Array<{ id: string; x: number; y: number }>>([])
  const [isMoving, setIsMoving] = useState(false)
  const [currentMoveDirection, setCurrentMoveDirection] = useState<'left' | 'right' | null>(null)
  const [showFoodPanel, setShowFoodPanel] = useState(false)
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loadingFood, setLoadingFood] = useState(false)
  const [feeding, setFeeding] = useState(false)
  const [dailyMoodGain, setDailyMoodGain] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [isHovering, setIsHovering] = useState(false)
  const [currentPetFullness, setCurrentPetFullness] = useState(pet.fullness)
  const petImageRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const moveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pettingTimeout = useRef<NodeJS.Timeout | null>(null)
  const heartIdCounter = useRef(0)
  const currentTargetRef = useRef({ x: 0.5, y: 0.75 })
  const positionInitializedRef = useRef(false)
  const recentDirectionsRef = useRef<('left' | 'right')[]>([])
  const petFacingDirection = (pet?.facingDirection || 'right') as 'left' | 'right'

  // Helper function to get sticker display content - same as dashboard Room
  const getStickerDisplay = (sticker: RoomSticker) => {
    if (sticker.imageUrl && !failedImages.has(sticker.id)) {
      return { type: 'image' as const, url: sticker.imageUrl }
    }
    // Use same STICKER_TYPES logic as dashboard Room
    const BASE_STICKERS: Record<string, { emoji: string; name: string }> = {
      rug: { emoji: '⬜', name: 'Rug' },
      desk: { emoji: '⬛', name: 'Desk' },
      monitor: { emoji: '⬛', name: 'Monitor' },
      poster: { emoji: '⬛', name: 'Poster' },
      cup: { emoji: '⬛', name: 'Cup' },
      speaker: { emoji: '⬛', name: 'Speaker' },
    }
    const SHOP_STICKERS = Object.values(SHOP_ITEM_MAP).reduce<Record<string, { emoji: string; name: string }>>(
      (acc, item) => {
        acc[item.id] = { emoji: item.emoji, name: item.name }
        return acc
      },
      {}
    )
    const STICKER_TYPES: Record<string, { emoji: string; name: string }> = {
      ...BASE_STICKERS,
      ...SHOP_STICKERS,
    }
    return { type: 'emoji' as const, emoji: STICKER_TYPES[sticker.stickerId]?.emoji || '⬜' }
  }

  // Sync pet fullness when pet prop changes
  useEffect(() => {
    setCurrentPetFullness(pet.fullness)
  }, [pet.fullness])

  // Fetch daily mood gain limit
  useEffect(() => {
    fetchDailyMoodGain()
  }, [])

  const fetchDailyMoodGain = async () => {
    try {
      // Check how much mood we've already given today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // This would need an API endpoint to check daily interactions
      // For now, we'll track it client-side with localStorage
      const key = `friend_mood_gain_${friendId}_${today.toISOString().split('T')[0]}`
      const stored = localStorage.getItem(key)
      setDailyMoodGain(stored ? parseInt(stored) : 0)
    } catch (error) {
      console.error('Failed to fetch daily mood gain:', error)
    }
  }

  // Pet movement - same logic as dashboard Room component
  useEffect(() => {
    if (!pet) return

    // Only initialize position once, not on every pet update
    if (!positionInitializedRef.current) {
      const initialPos = { x: 0.5, y: 0.75 } // Center-bottom of the room
      currentTargetRef.current = initialPos
      setPetPosition(initialPos)
      positionInitializedRef.current = true
    }

    // Calculate wait time between movements based on pet state
    const getWaitTime = () => {
      const baseWait = 3000 // 3 seconds base wait
      const moodFactor = pet.mood ? pet.mood / 100 : 0.5
      // Happier pets move more frequently (2-5 seconds)
      const waitVariation = 2000
      return baseWait + (1 - moodFactor) * waitVariation + Math.random() * 1000
    }

    // Generate a new target position with wandering behavior
    const generateTargetPosition = () => {
      const currentX = currentTargetRef.current.x
      const currentY = currentTargetRef.current.y
      
      // Room bounds: Same as sticker validation
      // SVG viewBox is 0-800 x 0-600, but room rectangle is at:
      // x: 50-750 (0.0625 to 0.9375 in normalized coordinates)
      // y: 50-550 (0.083 to 0.917 in normalized coordinates)
      const roomMinX = 50 / 800  // 0.0625
      const roomMaxX = 750 / 800  // 0.9375
      const roomMinY = 50 / 600  // 0.083
      const roomMaxY = 550 / 600  // 0.917
      
      if (!roomRef.current || !petImageRef.current) {
        // Fallback: use room bounds with conservative pet size estimate
        const estimatedPetSize = 128 // pixels
        const roomRect = roomRef.current?.getBoundingClientRect()
        if (roomRect) {
          const petSizeRatio = estimatedPetSize / Math.max(roomRect.width, roomRect.height)
          const minX = roomMinX + petSizeRatio / 2
          const maxX = roomMaxX - petSizeRatio / 2
          const minY = roomMinY + petSizeRatio / 2
          const maxY = roomMaxY - petSizeRatio / 2
          
          // Constrain to floor area (bottom part of room)
          const floorMinY = 0.65
          const finalMinY = Math.max(minY, floorMinY)
          const finalMaxY = Math.min(maxY, roomMaxY)
          
          // Reduce movement distance: 2-5% of the area
          const distance = 0.02 + Math.random() * 0.03
          const angle = Math.random() * Math.PI * 2
          let newX = currentX + Math.cos(angle) * distance
          let newY = currentY + Math.sin(angle) * distance
          newX = Math.max(minX, Math.min(maxX, newX))
          newY = Math.max(finalMinY, Math.min(finalMaxY, newY))
          
          // Track movement direction
          const movedLeft = newX < currentX
          const movedRight = newX > currentX
          if (movedLeft || movedRight) {
            recentDirectionsRef.current = [
              ...recentDirectionsRef.current.slice(-2),
              movedLeft ? 'left' : 'right'
            ]
          }
          
          return { x: newX, y: newY }
        }
        return { x: Math.max(roomMinX, Math.min(roomMaxX, currentX)), y: Math.max(roomMinY, Math.min(roomMaxY, currentY)) }
      }
      
      const roomRect = roomRef.current.getBoundingClientRect()
      const petRect = petImageRef.current.getBoundingClientRect()
      
      const roomWidth = roomRect.width
      const roomHeight = roomRect.height
      const petWidth = petRect.width
      const petHeight = petRect.height
      
      // Calculate normalized pet size (as ratio of room dimensions)
      const petWidthRatio = petWidth / roomWidth
      const petHeightRatio = petHeight / roomHeight
      
      // Calculate bounds considering pet image size
      const minX = roomMinX + petWidthRatio / 2
      const maxX = roomMaxX - petWidthRatio / 2
      const minY = roomMinY + petHeightRatio / 2
      const maxY = roomMaxY - petHeightRatio / 2
      
      // Further constrain to floor area (bottom part of room where pet should be)
      const floorMinX = 0.2
      const floorMaxX = 0.8
      const floorMinY = 0.65
      const finalMinX = Math.max(minX, floorMinX)
      const finalMaxX = Math.min(maxX, floorMaxX)
      const finalMinY = Math.max(minY, floorMinY)
      const finalMaxY = maxY  // Use roomMaxY (already accounts for pet height)
      
      // Wandering behavior: move in a direction with some randomness
      // Check if pet has been stuck on one side (last 3 moves in same direction)
      const recentDirections = recentDirectionsRef.current
      const isStuckOnLeft = recentDirections.length >= 3 && recentDirections.every(d => d === 'left')
      const isStuckOnRight = recentDirections.length >= 3 && recentDirections.every(d => d === 'right')
      
      // If stuck, bias movement towards the opposite side
      let angle: number
      if (isStuckOnLeft) {
        // Force movement towards right (0 to PI/2 or 3PI/2 to 2PI)
        const rightAngle = Math.random() < 0.5 
          ? Math.random() * Math.PI / 2  // 0 to 90 degrees
          : Math.PI * 1.5 + Math.random() * Math.PI / 2  // 270 to 360 degrees
        angle = rightAngle
      } else if (isStuckOnRight) {
        // Force movement towards left (PI/2 to 3PI/2)
        angle = Math.PI / 2 + Math.random() * Math.PI  // 90 to 270 degrees
      } else {
        // Normal random movement
        angle = Math.random() * Math.PI * 2
      }
      
      // Reduce movement distance: 2-5% of the area (much smaller steps)
      const distance = 0.02 + Math.random() * 0.03 // Move 2-5% of the area
      
      let newX = currentX + Math.cos(angle) * distance
      let newY = currentY + Math.sin(angle) * distance
      
      // Clamp to bounds (ensuring pet image doesn't go outside room)
      newX = Math.max(finalMinX, Math.min(finalMaxX, newX))
      newY = Math.max(finalMinY, Math.min(finalMaxY, newY))
      
      // Track movement direction for stuck detection
      const movedLeft = newX < currentX
      const movedRight = newX > currentX
      if (movedLeft || movedRight) {
        recentDirectionsRef.current = [
          ...recentDirectionsRef.current.slice(-2), // Keep last 2
          movedLeft ? 'left' : 'right'
        ]
      }
      
      return { x: newX, y: newY }
    }

    // Smooth movement function
    const movePet = () => {
      const target = generateTargetPosition()
      const currentPos = currentTargetRef.current
      
      // Determine movement direction (left or right)
      const isMovingLeft = target.x < currentPos.x
      const isMovingRight = target.x > currentPos.x
      const moveDirection = isMovingLeft ? 'left' : (isMovingRight ? 'right' : null)
      setCurrentMoveDirection(moveDirection)
      
      // Set moving state for walk animation
      setIsMoving(true)
      currentTargetRef.current = target
      
      // Update position - CSS transition will handle smooth movement
      setPetPosition(target)
      
      // Calculate movement duration based on distance
      const distance = Math.sqrt(
        Math.pow(target.x - currentPos.x, 2) + Math.pow(target.y - currentPos.y, 2)
      )
      const duration = 1500 + distance * 1000 // 1.5-2.5 seconds based on distance
      
      // Stop moving animation after movement completes
      setTimeout(() => {
        setIsMoving(false)
        // 保持最後的移動方向，不重置為原始朝向
      }, duration)
    }

    // Start movement cycle
    const scheduleNextMove = () => {
      if (moveIntervalRef.current) {
        clearTimeout(moveIntervalRef.current)
      }
      
      moveIntervalRef.current = setTimeout(() => {
        movePet()
        scheduleNextMove()
      }, getWaitTime())
    }

    // Start the movement cycle
    scheduleNextMove()
    
    return () => {
      if (moveIntervalRef.current) {
        clearTimeout(moveIntervalRef.current)
      }
    }
  }, [pet])

  // Fetch food inventory
  const fetchFoodInventory = async () => {
    setLoadingFood(true)
    try {
      const res = await fetch('/api/pet/food/inventory')
      if (res.ok) {
        const data = await res.json()
        setFoodItems(data)
      }
    } catch (error) {
      console.error('取得食物庫存失敗:', error)
    } finally {
      setLoadingFood(false)
    }
  }

  // Open food panel
  const handleOpenFoodPanel = () => {
    fetchFoodInventory()
    setShowFoodPanel(true)
  }

  // Handle pet click (petting)
  const handlePetClick = useCallback(async (e: React.MouseEvent) => {
    if (isPetting || dailyMoodGain >= 5) return

    e.stopPropagation()
    setIsPetting(true)

    // Generate heart particles - same as dashboard Room
    if (petImageRef.current) {
      const rect = petImageRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Generate multiple hearts, floating up from pet center
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: `heart-${Date.now()}-${i}`,
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
      }))
      
      setHearts(newHearts)
      
      // Clear heart effect
      setTimeout(() => {
        setHearts([])
      }, 2000)
    }

    try {
      const res = await fetch(`/api/friends/${friendId}/pet`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        const data = await res.json()
        
        // Update daily mood gain
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const key = `friend_mood_gain_${friendId}_${today.toISOString().split('T')[0]}`
        const newGain = dailyMoodGain + 1
        localStorage.setItem(key, newGain.toString())
        setDailyMoodGain(newGain)

        toast({
          title: 'Success ❤️',
          description: data.message || 'Petted friend\'s pet',
        })

        if (data.missionCompleted) {
          window.dispatchEvent(new CustomEvent('missionCompleted', { detail: data.missionCompleted }))
        }
      } else {
        const error = await res.json()
        toast({
          title: 'Failed',
          description: error.error || 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      if (pettingTimeout.current) {
        clearTimeout(pettingTimeout.current)
      }
      pettingTimeout.current = setTimeout(() => {
        setIsPetting(false)
      }, 1000)
    }
  }, [isPetting, dailyMoodGain, friendId, toast])

  // Handle feed
  const handleFeed = async (itemId: string) => {
    if (feeding) return
    setFeeding(true)

    try {
      const res = await fetch(`/api/friends/${friendId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })

      if (res.ok) {
        const data = await res.json()
        // 立即更新飽足感顯示
        const fullnessGain = data.fullnessGain || 5
        setCurrentPetFullness(prev => Math.min(100, prev + fullnessGain))
        toast({
          title: 'Success',
          description: data.message || 'Fed friend\'s pet',
        })
        setShowFoodPanel(false)
      } else {
        const error = await res.json()
        toast({
          title: 'Failed',
          description: error.error || 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setFeeding(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-white overflow-hidden"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/20"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            onClick={onLeave}
            className="gap-2 h-auto p-2"
          >
            <DoorOpen className="h-6 w-6" />
            <span className="hidden sm:inline text-sm">Leave</span>
          </Button>
          
          <div className="flex-1 flex flex-col items-center gap-1">
            <p className="text-sm text-black/60">
              {user.name || user.userID || 'Friend'}&apos;s Room
            </p>
            {/* Pet Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Heart className={`h-3.5 w-3.5 ${pet.mood < 20 ? 'text-red-600' : 'text-black'}`} />
                <span className="text-xs font-semibold text-black/70 uppercase tracking-wide">Mood</span>
                <span className={`text-xs font-bold ${pet.mood < 20 ? 'text-red-600' : 'text-black'}`}>
                  {pet.mood}/100
                  {pet.mood < 20 && <span className="ml-1 text-[10px] uppercase">⚠️ Warning</span>}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplet className={`h-3.5 w-3.5 ${currentPetFullness < 20 ? 'text-red-600' : 'text-black'}`} />
                <span className="text-xs font-semibold text-black/70 uppercase tracking-wide">Fullness</span>
                <span className={`text-xs font-bold ${currentPetFullness < 20 ? 'text-red-600' : 'text-black'}`}>
                  {currentPetFullness}/100
                  {currentPetFullness < 20 && <span className="ml-1 text-[10px] uppercase">⚠️ Warning</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="gap-2 opacity-50"
              onClick={() => {
                toast({
                  title: 'Coming Soon 📸',
                  description: 'Photo feature is under development, stay tuned!',
                  duration: 3000,
                })
              }}
              title="This feature is not yet available, stay tuned"
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="gap-2 opacity-50"
              onClick={() => {
                toast({
                  title: 'Coming Soon 🎁',
                  description: 'Gift feature is under development, stay tuned!',
                  duration: 3000,
                })
              }}
              title="This feature is not yet available, stay tuned"
            >
              <Gift className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Room Canvas */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        {/* Room background image - same as dashboard */}
        <div className="relative w-full max-w-[700px] h-full max-h-[500px]">
          <Image
            src="/room.png"
            alt="Room"
            fill
            sizes="700px"
            className="object-contain"
            priority
          />
          
          {/* Room area for stickers and pet */}
          <div ref={roomRef} className="absolute inset-0">

            {/* Stickers - same display logic as dashboard Room */}
            {stickers.map((sticker) => {
              const display = getStickerDisplay(sticker)
              const globalIndex = stickers.findIndex((s) => s.id === sticker.id)
              
              return (
                <div
                  key={sticker.id}
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: `${sticker.positionX * 100}%`,
                    top: `${sticker.positionY * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                    zIndex: 1 + globalIndex,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    {display.type === 'image' ? (
                      <img
                        src={display.url}
                        alt="Sticker"
                        className="max-w-[48px] max-h-[48px] lg:max-w-[64px] lg:max-h-[64px] object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(sticker.id))
                        }}
                        draggable={false}
                      />
                    ) : (
                      <span className="text-3xl lg:text-4xl" draggable={false}>
                        {display.emoji}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pet */}
            <div
              ref={petImageRef}
              className={`absolute transition-all ease-in-out cursor-pointer ${isMoving ? 'scale-105' : 'scale-100'} ${isHovering ? 'scale-110' : ''}`}
              style={{
                left: `${petPosition.x * 100}%`,
                top: `${petPosition.y * 100}%`,
                transform: `translate(-50%, -50%)`,
                zIndex: 50,
                transitionProperty: 'left, top, transform',
                transitionDuration: pet?.mood && pet.mood > 70 ? '1.8s' : '2.5s',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isMoving ? 'walk-bounce 0.4s ease-in-out infinite' : 'none',
              }}
              onClick={handlePetClick}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div className="relative w-24 h-24 lg:w-32 lg:h-32">
                {/* Hover hint */}
                {isHovering && !isPetting && dailyMoodGain < 5 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg animate-bounce z-10">
                    Pet me
                  </div>
                )}
                
                <Image
                  src={pet.imageUrl || '/cat.png'}
                  alt={pet.name}
                  fill
                  sizes="(max-width: 768px) 96px, 128px"
                  priority
                  className="object-contain transition-transform duration-300"
                  style={{
                    // 如果寵物預設朝左，往右走時要翻轉；如果預設朝右，往左走時要翻轉
                    transform: (() => {
                      if (!currentMoveDirection) {
                        // 沒有移動時，不翻轉（顯示原始朝向）
                        return 'scaleX(1)'
                      }
                      // 寵物預設朝左，往右走時翻轉
                      if (petFacingDirection === 'left' && currentMoveDirection === 'right') {
                        return 'scaleX(-1)'
                      }
                      // 寵物預設朝右，往左走時翻轉
                      if (petFacingDirection === 'right' && currentMoveDirection === 'left') {
                        return 'scaleX(-1)'
                      }
                      // 其他情況不翻轉
                      return 'scaleX(1)'
                    })(),
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  draggable={false}
                />
                
                {/* Accessories positioned relative to pet */}
                {accessories.map((accessory) => {
                  // When pet flips, flip the X position as well
                  const shouldFlip = (() => {
                    if (!currentMoveDirection) return false
                    if (petFacingDirection === 'left' && currentMoveDirection === 'right') return true
                    if (petFacingDirection === 'right' && currentMoveDirection === 'left') return true
                    return false
                  })()
                  const flippedPositionX = shouldFlip ? 1 - accessory.positionX : accessory.positionX
                  return (
                    <div
                      key={accessory.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${flippedPositionX * 100}%`,
                        top: `${accessory.positionY * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${accessory.rotation}deg) scale(${accessory.scale}) ${
                          (() => {
                            if (!currentMoveDirection) return ''
                            if (petFacingDirection === 'left' && currentMoveDirection === 'right') return 'scaleX(-1)'
                            if (petFacingDirection === 'right' && currentMoveDirection === 'left') return 'scaleX(-1)'
                            return ''
                          })()
                        }`,
                        zIndex: 10,
                      }}
                    >
                      {accessory.imageUrl ? (
                        <img
                          src={accessory.imageUrl}
                          alt="Accessory"
                          className="max-w-[24px] max-h-[24px] lg:max-w-[32px] lg:max-h-[32px] object-contain"
                        />
                      ) : (
                        <span className="text-xl lg:text-2xl">
                          {SHOP_ITEM_MAP[accessory.accessoryId]?.emoji || '🎀'}
                        </span>
                      )}
                    </div>
                  )
                })}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heart particles effect - same as dashboard */}
      {hearts.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {hearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute animate-heart-float"
              style={{
                left: `${heart.x}px`,
                top: `${heart.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/20"
      >
        <div className="flex items-center justify-center p-4">
          <Button
            onClick={handleOpenFoodPanel}
            className="bg-black text-white hover:bg-black/80 gap-2"
            size="lg"
          >
            <Utensils className="h-5 w-5" />
            Feed {pet.name}
          </Button>
        </div>
      </motion.div>

      {/* Food Panel */}
      <AnimatePresence>
        {showFoodPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setShowFoodPanel(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full bg-white rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Select Food</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFoodPanel(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {loadingFood ? (
                <div className="text-center py-8 text-black/60">Loading...</div>
              ) : foodItems.length === 0 ? (
                <div className="text-center py-8 text-black/60">No food available</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {foodItems.map((item) => (
                    <button
                      key={item.itemId}
                      onClick={() => handleFeed(item.itemId)}
                      disabled={feeding || item.count <= 0}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-black/20 hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center bg-black/5 rounded-lg border border-black/20">
                          <span className="text-2xl">{item.emoji}</span>
                        </div>
                      )}
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className="text-xs text-black/60">x{item.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily limit notification */}
      {dailyMoodGain >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-0 right-0 z-50 flex justify-center items-center"
        >
          <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm whitespace-nowrap">
            Daily petting reward limit reached (+5% mood) ✓
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
