'use client'

import Image from 'next/image'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  facingDirection?: string
  points: number
  fullness: number
  mood: number
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

interface PetDisplayProps {
  pet: Pet | null
  accessories?: PetAccessory[]
  onAccessoryDelete?: (accessoryId: string) => void
  showDeleteButtons?: boolean
  onAccessoryDrop?: (accessoryId: string, positionX: number, positionY: number) => void
}

export default function PetDisplay({ pet, accessories = [], onAccessoryDelete, showDeleteButtons = false, onAccessoryDrop }: PetDisplayProps) {
  const [hoveredAccessoryId, setHoveredAccessoryId] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  if (!pet) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-black/60 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm px-6 py-3 uppercase tracking-wide shadow-sm">
          Loading...
        </div>
      </div>
    )
  }

  const getMoodText = (mood: number) => {
    if (mood >= 80) return 'Feeling Great!'
    if (mood >= 60) return 'Feeling Good'
    if (mood >= 40) return 'Feeling Okay'
    if (mood >= 20) return 'Feeling Low'
    return 'Feeling Bad'
  }

  const handleDeleteAccessory = async (accessoryId: string) => {
    if (onAccessoryDelete) {
      onAccessoryDelete(accessoryId)
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  // Handle drop - calculate position relative to pet container and call parent
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    if (!onAccessoryDrop) return

    const data = e.dataTransfer.getData('application/json')
    if (!data) return

    try {
      const parsed = JSON.parse(data)
      const accessoryId = parsed.accessoryId
      if (!accessoryId) return

      // Calculate position relative to the pet image container
      const rect = e.currentTarget.getBoundingClientRect()
      const positionX = (e.clientX - rect.left) / rect.width
      const positionY = (e.clientY - rect.top) / rect.height

      // Clamp position to 0-1 range
      const clampedX = Math.min(Math.max(positionX, 0), 1)
      const clampedY = Math.min(Math.max(positionY, 0), 1)

      onAccessoryDrop(accessoryId, clampedX, clampedY)
    } catch (error) {
      console.error('Invalid accessory data:', error)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Speech bubble - minimalist */}
      <div className="relative mb-4">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl border border-black/20 relative shadow-sm">
          <p className="text-sm font-bold text-black uppercase tracking-wide whitespace-nowrap">
            {getMoodText(pet.mood)}
          </p>
          {/* Speech bubble tail */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-transparent border-t-black"></div>
          </div>
        </div>
      </div>

      {/* Pet image with accessories */}
      <div 
        className={`relative w-48 h-48 ${onAccessoryDrop ? 'cursor-crosshair' : ''}`}
        style={{ minHeight: '192px' }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (onAccessoryDrop) {
            setIsDraggingOver(true)
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX
          const y = e.clientY
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDraggingOver(false)
          }
        }}
        onDragOver={onAccessoryDrop ? handleDragOver : undefined}
        onDrop={onAccessoryDrop ? handleDrop : undefined}
      >
        {/* Drop zone overlay */}
        {isDraggingOver && onAccessoryDrop && (
          <div className="absolute inset-0 border-4 border-dashed border-black bg-black/10 z-20 pointer-events-none" />
        )}
        <Image
          src={pet.imageUrl || '/cat.png'}
          alt={pet.name}
          fill
          sizes="192px"
          priority
          className="object-contain pointer-events-none select-none"
          draggable={false}
        />
        {/* Accessories positioned relative to pet */}
        {accessories.map((accessory) => (
          <div
            key={accessory.id}
            className="absolute pointer-events-none"
            style={{
              left: `${accessory.positionX * 100}%`,
              top: `${accessory.positionY * 100}%`,
              transform: `translate(-50%, -50%) rotate(${accessory.rotation}deg) scale(${accessory.scale})`,
              zIndex: 10,
            }}
            onMouseEnter={() => setHoveredAccessoryId(accessory.id)}
            onMouseLeave={() => setHoveredAccessoryId(null)}
          >
            <div className="relative flex items-center justify-center pointer-events-auto">
              {accessory.imageUrl && !failedImages.has(accessory.id) ? (
                <img
                  src={accessory.imageUrl}
                  alt="Accessory"
                  className="max-w-[32px] max-h-[32px] object-contain"
                  onError={() => {
                    setFailedImages((prev) => new Set(prev).add(accessory.id))
                  }}
                />
              ) : (
                <span className="text-2xl">🎀</span>
              )}
              {showDeleteButtons && hoveredAccessoryId === accessory.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteAccessory(accessory.id)
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white border-2 border-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                  aria-label="Remove accessory"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
