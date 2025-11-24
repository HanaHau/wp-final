'use client'

import { useState } from 'react'
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
}

interface AvailableSticker {
  stickerId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string
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

interface RoomProps {
  pet: Pet | null
  stickers?: RoomSticker[]
  availableStickers?: AvailableSticker[]
  onStickerPlaced?: () => void
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

export default function Room({ pet, stickers = [], availableStickers = [], onStickerPlaced }: RoomProps) {
  const [hoveredStickerId, setHoveredStickerId] = useState<string | null>(null)
  const { toast } = useToast()
  const [isPlacing, setIsPlacing] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
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
    
    // Prevent duplicate placements
    if (isPlacing) {
      return
    }

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

    const rect = event.currentTarget.getBoundingClientRect()
    const positionX = (event.clientX - rect.left) / rect.width
    const positionY = (event.clientY - rect.top) / rect.height

    setIsPlacing(true)
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
      setIsPlacing(false)
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
  const getStickerDisplay = (stickerId: string) => {
    const availableSticker = availableStickers.find((s) => s.stickerId === stickerId)
    if (availableSticker?.imageUrl) {
      return { type: 'image' as const, url: availableSticker.imageUrl }
    }
    return { type: 'emoji' as const, emoji: stickerTypes[stickerId]?.emoji || '⬛' }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center gap-6 py-8 min-h-[400px]">
      {/* Sticker palette */}
      <div className="relative flex flex-col w-[155px] h-[400px] border-2 border-black bg-white px-3 py-2 overflow-y-auto">
        <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2">Stickers</h3>
        {availableStickers.length === 0 && (
          <p className="text-[10px] text-center text-black/40">No stickers available</p>
        )}
        <div className="flex flex-col gap-2">
          {availableStickers.map((sticker) => (
            <div
              key={sticker.stickerId}
              draggable={sticker.count > 0}
              onDragStart={(e) => handleDragStart(e, sticker.stickerId, sticker.count)}
              className={`border-2 border-black p-2 text-center cursor-grab active:cursor-grabbing ${
                sticker.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {sticker.imageUrl && !failedImages.has(sticker.stickerId) ? (
                <div className="relative w-full h-12 mb-1">
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.name}
                    className="w-full h-full object-contain"
                    onError={() => {
                      setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                    }}
                  />
                </div>
              ) : (
                <div className="text-2xl">{sticker.emoji}</div>
              )}
              <div className="text-[10px] font-semibold uppercase mt-1">{sticker.name}</div>
              <div className="text-[10px] text-black/60">x{sticker.count}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-black/40 mt-auto">
          Drag stickers to room
        </p>
      </div>

      {/* One-Point Perspective Room - Simple: square + 4 perspective lines */}
      <div className="relative" style={{ width: '600px', height: '450px' }}>
        <svg
          width="600"
          height="450"
          viewBox="0 0 800 600"
          className="w-full h-full"
        >
          {/* Outer rectangle (room boundaries) - visible border */}
          <rect
            x="50"
            y="50"
            width="700"
            height="500"
            fill="none"
            stroke="black"
            strokeWidth="4"
          />

          {/* Back wall - center square (bigger) */}
          <rect
            x="250"
            y="150"
            width="300"
            height="300"
            fill="white"
            stroke="black"
            strokeWidth="4"
          />

          {/* 4 perspective lines connecting corners of square to corners of rectangle */}
          {/* Top-left corner */}
          <line
            x1="50"
            y1="50"
            x2="250"
            y2="150"
            stroke="black"
            strokeWidth="4"
          />
          {/* Top-right corner */}
          <line
            x1="750"
            y1="50"
            x2="550"
            y2="150"
            stroke="black"
            strokeWidth="4"
          />
          {/* Bottom-left corner */}
          <line
            x1="50"
            y1="550"
            x2="250"
            y2="450"
            stroke="black"
            strokeWidth="4"
          />
          {/* Bottom-right corner */}
          <line
            x1="750"
            y1="550"
            x2="550"
            y2="450"
            stroke="black"
            strokeWidth="4"
          />
        </svg>

        {/* Floor area for stickers and pet - positioned in center of floor */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '70%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '200px',
          }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'floor')}
        >
          {/* Floor stickers */}
          {stickers
            .filter((s) => s.layer === 'floor')
            .map((sticker) => {
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
                  className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center relative"
                  onMouseEnter={() => setHoveredStickerId(sticker.id)}
                  onMouseLeave={() => setHoveredStickerId(null)}
                >
                  {(() => {
                    const display = getStickerDisplay(sticker.stickerId)
                    if (display.type === 'image' && !failedImages.has(sticker.stickerId)) {
                      return (
                        <img
                          src={display.url}
                          alt="Sticker"
                          className="w-full h-full object-contain"
                          onError={() => {
                            setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                          }}
                        />
                      )
                    }
                    return <span className="text-xl">{display.emoji}</span>
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
          
          {/* Pet on floor */}
          {pet && (
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}
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
              </div>
            </div>
          )}
        </div>

        {/* Left wall area for stickers */}
        <div
          className="absolute"
          style={{
            left: '12.5%',
            top: '33%',
            width: '250px',
            height: '200px',
            clipPath: 'polygon(0 0, 100% 25%, 100% 75%, 0 100%)',
          }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'wall-left')}
        >
          {stickers
            .filter((s) => s.layer === 'wall-left')
            .map((sticker, index) => {
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
                    className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center relative"
                    onMouseEnter={() => setHoveredStickerId(sticker.id)}
                    onMouseLeave={() => setHoveredStickerId(null)}
                  >
                    {(() => {
                      const display = getStickerDisplay(sticker.stickerId)
                      if (display.type === 'image' && !failedImages.has(sticker.stickerId)) {
                        return (
                          <img
                            src={display.url}
                            alt="Sticker"
                            className="w-full h-full object-contain"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                            }}
                          />
                        )
                      }
                      return <span className="text-xl">{display.emoji}</span>
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
        </div>

        {/* Right wall area for stickers */}
        <div
          className="absolute"
          style={{
            right: '12.5%',
            top: '33%',
            width: '250px',
            height: '200px',
            clipPath: 'polygon(0 25%, 100% 0, 100% 100%, 0 75%)',
          }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'wall-right')}
        >
          {stickers
            .filter((s) => s.layer === 'wall-right')
            .map((sticker) => {
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
                    className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center relative"
                    onMouseEnter={() => setHoveredStickerId(sticker.id)}
                    onMouseLeave={() => setHoveredStickerId(null)}
                  >
                    {(() => {
                      const display = getStickerDisplay(sticker.stickerId)
                      if (display.type === 'image' && !failedImages.has(sticker.stickerId)) {
                        return (
                          <img
                            src={display.url}
                            alt="Sticker"
                            className="w-full h-full object-contain"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                            }}
                          />
                        )
                      }
                      return <span className="text-xl">{display.emoji}</span>
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
        </div>
      </div>
    </div>
  )
}

