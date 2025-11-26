'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

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

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
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

interface RoomProps {
  pet: Pet | null
  stickers?: RoomSticker[]
  availableStickers?: AvailableSticker[]
  foodItems?: FoodItem[]
  accessories?: PetAccessory[]
  availableAccessories?: AvailableAccessory[]
  onStickerPlaced?: () => void
  onPetFed?: () => void
  onAccessoryPlaced?: () => void
}

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

export default function Room({ pet, stickers = [], availableStickers = [], foodItems = [], accessories = [], availableAccessories = [], onStickerPlaced, onPetFed, onAccessoryPlaced }: RoomProps) {
  const [hoveredStickerId, setHoveredStickerId] = useState<string | null>(null)
  const { toast } = useToast()
  const [placingStickers, setPlacingStickers] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [feeding, setFeeding] = useState(false)
  const [petPosition, setPetPosition] = useState({ x: 0.5, y: 0.75 })
  const [isPetting, setIsPetting] = useState(false)
  const [showHandIcon, setShowHandIcon] = useState(false)
  const pettingTimeout = useRef<NodeJS.Timeout | null>(null)

  // Make pet move randomly in the bottom trapezoid (floor area)
  useEffect(() => {
    if (!pet) return

    const movePet = () => {
      // Bottom trapezoid bounds (floor area)
      // X: 0.2 to 0.8 (within the room width)
      // Y: 0.65 to 0.9 (bottom area - floor)
      const newX = 0.2 + Math.random() * 0.6 // 0.2 to 0.8
      const newY = 0.65 + Math.random() * 0.25 // 0.65 to 0.9
      setPetPosition({ x: newX, y: newY })
    }

    // Move immediately, then every 3-5 seconds
    movePet()
    const interval = setInterval(movePet, 3000 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [pet])

  useEffect(() => {
    return () => {
      if (pettingTimeout.current) {
        clearTimeout(pettingTimeout.current)
      }
    }
  }, [])

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleFoodDragStart = (event: React.DragEvent<HTMLDivElement>, itemId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'food', itemId }))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleAccessoryDragStart = (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'accessory', accessoryId }))
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handlePlaceAccessory = async (accessoryId: string, positionX: number, positionY: number) => {
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

      if (res.ok) {
        if (onAccessoryPlaced) {
          onAccessoryPlaced()
        }
      } else {
        const error = await res.json()
        toast({
          title: 'Failed to place accessory',
          description: error.error || 'Please try again',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Place accessory error:', error)
      toast({
        title: 'Failed to place accessory',
        description: 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleFeedPet = async (itemId: string) => {
    if (feeding) return
    setFeeding(true)
    try {
      const res = await fetch('/api/pet/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to feed pet')
      }

      const data = await res.json()
      toast({
        title: data.message || 'Pet fed!',
        description: `Mood: +10, Fullness: +15`,
      })
      onPetFed?.()
    } catch (error: any) {
      toast({
        title: 'Feed Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setFeeding(false)
    }
  }

  const handlePetPet = async () => {
    if (isPetting) return
    setIsPetting(true)
    setShowHandIcon(false)
    if (pettingTimeout.current) {
      clearTimeout(pettingTimeout.current)
    }

    try {
      const res = await fetch('/api/pet/pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to pet')
      }

      const data = await res.json()
      toast({
        title: data.message || 'Pet petted!',
        description: `Mood: +5`,
      })
      onPetFed?.()
    } catch (error: any) {
      toast({
        title: 'Pet Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      pettingTimeout.current = setTimeout(() => {
        setIsPetting(false)
      }, 2500)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    layer: 'floor' | 'wall-left' | 'wall-right'
  ) => {
    event.preventDefault()

    const data = event.dataTransfer.getData('application/json')
    if (!data) return

    let stickerId: string | null = null
    try {
      const parsed = JSON.parse(data)
      stickerId = parsed.stickerId
    } catch (error) {
      console.error('Invalid sticker data:', error)
      return
    }

    if (!stickerId) return

    // Create a unique key for this placement attempt to prevent race conditions
    const placementKey = `${stickerId}-${Date.now()}-${Math.random()}`
    
    // Prevent rapid duplicate placements - allow only one placement at a time
    if (placingStickers.size > 0) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const positionX = (event.clientX - rect.left) / rect.width
    const positionY = (event.clientY - rect.top) / rect.height

    setPlacingStickers(prev => new Set(prev).add(placementKey))
    try {
      const res = await fetch('/api/pet/stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stickerId,
          positionX: Math.min(Math.max(positionX, 0), 1),
          positionY: Math.min(Math.max(positionY, 0), 1),
          layer,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to place sticker')
      }

      toast({
        title: 'Sticker Placed!',
        description: 'Successfully added decoration to room.',
      })
      onStickerPlaced?.()
    } catch (error: any) {
      toast({
        title: 'Placement Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      // Remove this placement key and allow new placements after a short delay
      setPlacingStickers(prev => {
        const next = new Set(prev)
        next.delete(placementKey)
        return next
      })
    }
  }

  const handleDeleteSticker = async (stickerId: string) => {
    try {
      const res = await fetch(`/api/pet/stickers/${stickerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete sticker')
      }

      toast({
        title: 'Sticker Removed',
        description: 'Sticker has been removed and returned to your inventory.',
      })
      onStickerPlaced?.()
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  // Sticker definitions - minimalist black/white stickers
  const stickerTypes = STICKER_TYPES

  // Helper function to get sticker display content
  const getStickerDisplay = (sticker: RoomSticker) => {
    // First check if the sticker itself has imageUrl (from API)
    if (sticker.imageUrl) {
      return { type: 'image' as const, url: sticker.imageUrl }
    }
    // Then check available stickers
    const availableSticker = availableStickers.find((s) => s.stickerId === sticker.stickerId)
    if (availableSticker?.imageUrl) {
      return { type: 'image' as const, url: availableSticker.imageUrl }
    }
    return { type: 'emoji' as const, emoji: stickerTypes[sticker.stickerId]?.emoji || '⬛' }
  }

  return (
    <div className="relative w-full h-full flex items-start justify-start gap-4 min-h-[400px] mt-4">
      {/* Room on left (big) - moved down */}
      <div className="flex-1 flex items-start justify-start min-w-0">
      {/* Room image */}
      <div className="relative" style={{ width: '100%', maxWidth: '700px', height: '500px' }}>
        <Image
          src="/room.png"
          alt="Room"
          fill
          sizes="700px"
          className="object-contain"
          priority
        />

        {/* Entire room area for stickers and pet - full droppable area */}
        <div
          className="absolute inset-0"
          onDragOver={handleDragOver}
          onDrop={(e) => {
            const data = e.dataTransfer.getData('application/json')
            if (!data) return

            try {
              const parsed = JSON.parse(data)
              // Check if it's food
              if (parsed.type === 'food') {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height

                const dx = x - petPosition.x
                const dy = y - petPosition.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < 0.25) {
                  handleFeedPet(parsed.itemId)
                  return
                }
                toast({
                  title: 'Move nearer the pet',
                  description: 'Drop food closer to the pet to feed it.',
                  variant: 'destructive',
                })
              } else if (parsed.type === 'accessory') {
                // Handle accessory drop - place on pet (exactly like food)
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height

                const dx = x - petPosition.x
                const dy = y - petPosition.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < 0.25) {
                  // Place accessory on pet - position relative to pet center (0.5, 0.5)
                  // Map drop position to pet-relative coordinates (0-1 range)
                  // Drop position is relative to room, pet is at petPosition
                  // We want position relative to pet's center, so normalize around petPosition
                  const relativeX = 0.5 + (x - petPosition.x) / 0.5 // Scale to pet's area
                  const relativeY = 0.5 + (y - petPosition.y) / 0.5
                  const clampedX = Math.min(Math.max(relativeX, 0), 1)
                  const clampedY = Math.min(Math.max(relativeY, 0), 1)

                  handlePlaceAccessory(parsed.accessoryId, clampedX, clampedY)
                  return
                }
                toast({
                  title: 'Move nearer the pet',
                  description: 'Drop accessory closer to the pet to place it.',
                  variant: 'destructive',
                })
              } else {
                // Regular sticker placement
                // Check if drop is inside the room rectangle (not outside)
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                
                // Room bounds: SVG viewBox is 0-800 x 0-600, but room rectangle is at:
                // x: 50-750 (0.0625 to 0.9375 in normalized coordinates)
                // y: 50-550 (0.083 to 0.917 in normalized coordinates)
                const roomMinX = 50 / 800 // 0.0625
                const roomMaxX = 750 / 800 // 0.9375
                const roomMinY = 50 / 600 // 0.083
                const roomMaxY = 550 / 600 // 0.917
                
                // Only allow placement inside the room rectangle
                if (x < roomMinX || x > roomMaxX || y < roomMinY || y > roomMaxY) {
                  toast({
                    title: 'Invalid Placement',
                    description: 'Stickers can only be placed inside the room.',
                    variant: 'destructive',
                  })
                  return
                }
                
                // Determine layer based on drop position
                let layer: 'floor' | 'wall-left' | 'wall-right' = 'floor'
                if (x < 0.3) {
                  layer = 'wall-left'
                } else if (x > 0.7) {
                  layer = 'wall-right'
                } else if (y > 0.6) {
                  layer = 'floor'
                } else {
                  layer = 'floor' // Default to floor for middle area
                }
                
                handleDrop(e, layer)
              }
            } catch (error) {
              console.error('Invalid drop data:', error)
            }
          }}
        >
          {/* All stickers - positioned absolutely within the room */}
          {stickers.map((sticker) => {
              // Calculate global index across all stickers for consistent z-index
              const globalIndex = stickers.findIndex((s) => s.id === sticker.id)
              return (
                <div
                  key={sticker.id}
                  className="absolute"
                  style={{
                    left: `${sticker.positionX * 100}%`,
                    top: `${sticker.positionY * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                    zIndex: 10 + globalIndex, // Use global index for consistent ordering
                  }}
                >
                <div
                  className="relative flex items-center justify-center"
                  onMouseEnter={() => setHoveredStickerId(sticker.id)}
                  onMouseLeave={() => setHoveredStickerId(null)}
                >
                  {(() => {
                    const display = getStickerDisplay(sticker)
                    if (display.type === 'image' && !failedImages.has(sticker.id)) {
                      return (
                        <img
                          src={display.url}
                          alt="Sticker"
                          className="max-w-[48px] max-h-[48px] object-contain"
                          onError={() => {
                            setFailedImages((prev) => new Set(prev).add(sticker.id))
                          }}
                        />
                      )
                    }
                    return <span className="text-3xl">{display.emoji}</span>
                  })()}
                  {hoveredStickerId === sticker.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSticker(sticker.id)
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white border-2 border-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                      aria-label="Remove sticker"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              )
            })}
          
          {/* Pet on floor - randomly positioned in bottom trapezoid */}
          {pet && (
            <div
              className="absolute transition-all duration-[2000ms] ease-in-out cursor-pointer"
              style={{
                left: `${petPosition.x * 100}%`,
                top: `${petPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}
              onMouseEnter={() => setShowHandIcon(true)}
              onMouseLeave={() => !isPetting && setShowHandIcon(false)}
              onClick={handlePetPet}
            >
              <div className="relative w-32 h-32">
                <Image
                  src={pet.imageUrl || '/cat.jpg'}
                  alt={pet.name}
                  fill
                  sizes="128px"
                  priority
                  className="object-contain"
                />
                {/* Accessories positioned relative to pet */}
                {accessories.map((accessory) => (
                  <div
                    key={accessory.id}
                    className="absolute"
                    style={{
                      left: `${accessory.positionX * 100}%`,
                      top: `${accessory.positionY * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${accessory.rotation}deg) scale(${accessory.scale})`,
                      zIndex: 10,
                    }}
                  >
                    {accessory.imageUrl && !failedImages.has(accessory.id) ? (
                      <img
                        src={accessory.imageUrl}
                        alt="Accessory"
                        className="max-w-[24px] max-h-[24px] object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(accessory.id))
                        }}
                      />
                    ) : (
                      <span className="text-xl" title={accessory.accessoryId}>
                        {(() => {
                          // Look up emoji from SHOP_ITEM_MAP based on accessoryId
                          const shopItem = SHOP_ITEM_MAP[accessory.accessoryId]
                          if (!shopItem && !accessory.accessoryId.startsWith('custom-')) {
                            console.error('Room: Invalid accessoryId:', accessory.accessoryId, 'Expected: acc1 or acc2')
                          }
                          return shopItem?.emoji || '🎀'
                        })()}
                      </span>
                    )}
                  </div>
                ))}
                {/* Hand icon on hover - closer to pet */}
                {showHandIcon && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <span className="text-3xl">👋</span>
                  </div>
                )}
                {/* Petting animation - red heart to the left, not covering face */}
                {isPetting && (
                  <div className="absolute right-[-28px] top-12">
                    <div className="text-4xl animate-pulse">❤️</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Stickers, Food, and Accessories on right (vertically aligned, very wide grids with square items) */}
      <div
        className="flex flex-col gap-2 flex-shrink-0 self-start"
        style={{
          width: '460px',
          minWidth: '400px',
          marginLeft: '10px',
          position: 'absolute',
          left: '680px',
          top: '1px',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
        }}
      >
        {/* Sticker palette - very wide grid with square items */}
        <div className="relative flex flex-col w-full h-[180px] border-2 border-black bg-white px-3 py-2 overflow-y-auto">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2">Stickers</h3>
          {availableStickers.length === 0 && (
            <p className="text-[10px] text-center text-black/40">No stickers available</p>
          )}
          <div className="grid grid-cols-5 gap-1">
            {availableStickers.map((sticker) => (
              <div
                key={sticker.stickerId}
                draggable={sticker.count > 0}
                onDragStart={(e) => handleDragStart(e, sticker.stickerId, sticker.count)}
                className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing w-[62px] h-[62px] ${
                  sticker.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {sticker.imageUrl && !failedImages.has(sticker.stickerId) ? (
                  <div className="relative w-full h-full mb-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className="h-12 w-12 object-contain"
                      onError={() => {
                        setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-xl mb-1">{sticker.emoji}</div>
                )}
                <div className="text-[10px] font-semibold uppercase text-center leading-tight">{sticker.name}</div>
                <div className="text-[10px] text-black/60">x{sticker.count}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center text-black/40 mt-2">
            Drag stickers to room
          </p>
        </div>

        {/* Food palette - very wide grid with square items */}
        <div className="relative flex flex-col w-full h-[180px] border-2 border-black bg-white px-3 py-2 overflow-y-auto">
            <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2">Food</h3>
          {foodItems.length > 0 ? (
            <>
              <div className="grid grid-cols-5 gap-1">
                {foodItems.map((food) => (
                  <div
                    key={food.itemId}
                    draggable={food.count > 0}
                    onDragStart={(e) => handleFoodDragStart(e, food.itemId, food.count)}
                    className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing w-[62px] h-[62px] ${
                      food.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="relative w-full h-full mb-1 flex items-center justify-center">
                      <span className="text-xl">{food.emoji}</span>
                    </div>
                    <div className="text-[10px] font-semibold uppercase text-center leading-tight">{food.name}</div>
                    <div className="text-[10px] text-black/60">x{food.count}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-black/40 mt-2">
                Drag food to pet
              </p>
            </>
          ) : (
            <p className="text-[12px] text-center text-black/40 mt-6 uppercase tracking-wide">
              No food yet — visit the shop to buy some!
            </p>
          )}
        </div>

        {/* Accessories palette - very wide grid with square items */}
        <div className="relative flex flex-col w-full min-h-[180px] border-2 border-black bg-white px-3 py-2 overflow-y-auto">
            <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2">Accessories</h3>
          {availableAccessories.length > 0 ? (
            <>
              <div className="grid grid-cols-5 gap-1">
                {availableAccessories.map((accessory) => (
                  <div
                    key={accessory.accessoryId}
                    draggable={accessory.count > 0}
                    onDragStart={(e) => handleAccessoryDragStart(e, accessory.accessoryId, accessory.count)}
                    className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing w-[62px] h-[62px] ${
                      accessory.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="relative w-full h-full mb-1 flex items-center justify-center">
                      {accessory.imageUrl && !failedImages.has(accessory.accessoryId) ? (
                        <img
                          src={accessory.imageUrl}
                          alt={accessory.name}
                          className="max-w-[24px] max-h-[24px] object-contain"
                          onError={() => {
                            setFailedImages((prev) => new Set(prev).add(accessory.accessoryId))
                          }}
                        />
                      ) : (
                        <span className="text-xl">{accessory.emoji}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold uppercase text-center leading-tight">{accessory.name}</div>
                    <div className="text-[10px] text-black/60">x{accessory.count}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-black/40 mt-2">
                Drag accessory to pet
              </p>
            </>
          ) : (
            <p className="text-[12px] text-center text-black/40 mt-6 uppercase tracking-wide">
              No accessories yet — visit the shop to buy some!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

