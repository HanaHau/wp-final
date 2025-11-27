'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, Edit3, Package } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { SHOP_ITEM_MAP } from '@/data/shop-items'
import EditPanel from './EditPanel'
import ItemControls from './ItemControls'

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
  const [editMode, setEditMode] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ type: 'sticker' | 'accessory'; id: string } | null>(null)
  const [selectedItemPosition, setSelectedItemPosition] = useState<{ x: number; y: number } | null>(null)
  const [placingItem, setPlacingItem] = useState<{ type: 'sticker' | 'accessory'; id: string } | null>(null)
  const [draggingItem, setDraggingItem] = useState<{ type: string; id: string } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; emoji: string } | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false)
  const isProcessingDrop = useRef(false)
  const draggingStickerIdRef = useRef<string | null>(null)
  const roomRef = useRef<HTMLDivElement>(null)

  // Make pet move randomly in the bottom trapezoid (floor area) with more natural movement
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

    // Move immediately, then every 4-7 seconds (more natural pace)
    movePet()
    const interval = setInterval(() => {
      movePet()
    }, 4000 + Math.random() * 3000)

    return () => clearInterval(interval)
  }, [pet])

  // React to dragging items - pet shows interest
  useEffect(() => {
    if (draggingItem && pet) {
      // Pet looks interested when items are being dragged
      const interestReaction = setTimeout(() => {
        // Could add animation or visual feedback here
      }, 300)
      return () => clearTimeout(interestReaction)
    }
  }, [draggingItem, pet])

  // ESC key to cancel placing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (placingItem) {
          setPlacingItem(null)
          toast({ title: '已取消放置' })
        }
        if (selectedItem) {
          setSelectedItem(null)
          setSelectedItemPosition(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [placingItem, selectedItem, toast])

  // Track mouse position during drag (fallback for browsers that don't fire onDrag)
  useEffect(() => {
    if (!draggingItem) return

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY })
      // Update drag preview for emoji stickers
      if (dragPreview) {
        setDragPreview({ ...dragPreview, x: e.clientX, y: e.clientY })
      }
    }

    // 使用 capture phase 確保能捕獲到事件
    window.addEventListener('mousemove', handleMouseMove, true)
    return () => window.removeEventListener('mousemove', handleMouseMove, true)
  }, [draggingItem, dragPreview])

  useEffect(() => {
    return () => {
      if (pettingTimeout.current) {
        clearTimeout(pettingTimeout.current)
      }
    }
  }, [])

  // Touch and drag preview handling
  const handleTouchStart = useCallback((e: React.TouchEvent, type: string, id: string, emoji: string, count: number) => {
    if (count <= 0) return
    e.preventDefault()
    setDraggingItem({ type, id })
    const touch = e.touches[0]
    setDragPreview({ x: touch.clientX, y: touch.clientY, emoji })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingItem || !dragPreview) return
    e.preventDefault()
    const touch = e.touches[0]
    setDragPreview({ ...dragPreview, x: touch.clientX, y: touch.clientY })
  }, [draggingItem, dragPreview])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!draggingItem || !roomRef.current) {
      setDraggingItem(null)
      setDragPreview(null)
      return
    }
    
    const touch = e.changedTouches[0]
    const roomRect = roomRef.current.getBoundingClientRect()
    
    // Check if drop is within room bounds
    if (
      touch.clientX >= roomRect.left &&
      touch.clientX <= roomRect.right &&
      touch.clientY >= roomRect.top &&
      touch.clientY <= roomRect.bottom
    ) {
      const x = (touch.clientX - roomRect.left) / roomRect.width
      const y = (touch.clientY - roomRect.top) / roomRect.height
      
      // Handle different item types
      if (draggingItem.type === 'food') {
        const dx = x - petPosition.x
        const dy = y - petPosition.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 0.25) {
          handleFeedPet(draggingItem.id)
        } else {
          toast({
            title: '靠近寵物一點',
            description: '把食物拖到寵物附近來餵食',
            variant: 'destructive',
          })
        }
      } else if (draggingItem.type === 'accessory') {
        const dx = x - petPosition.x
        const dy = y - petPosition.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 0.25) {
          const relativeX = 0.5 + (x - petPosition.x) / 0.5
          const relativeY = 0.5 + (y - petPosition.y) / 0.5
          const clampedX = Math.min(Math.max(relativeX, 0), 1)
          const clampedY = Math.min(Math.max(relativeY, 0), 1)
          handlePlaceAccessory(draggingItem.id, clampedX, clampedY)
        } else {
          toast({
            title: '靠近寵物一點',
            description: '把配件拖到寵物附近來裝備',
            variant: 'destructive',
          })
        }
      } else {
        // Sticker placement
        const roomMinX = 50 / 800
        const roomMaxX = 750 / 800
        const roomMinY = 50 / 600
        const roomMaxY = 550 / 600
        
        if (x < roomMinX || x > roomMaxX || y < roomMinY || y > roomMaxY) {
          toast({
            title: '放置位置無效',
            description: '貼紙只能放在房間內',
            variant: 'destructive',
          })
        } else {
          let layer: 'floor' | 'wall-left' | 'wall-right' = 'floor'
          if (x < 0.3) layer = 'wall-left'
          else if (x > 0.7) layer = 'wall-right'
          else if (y > 0.6) layer = 'floor'
          
          handleDropSticker(draggingItem.id, x, y, layer)
        }
      }
    }
    
    setDraggingItem(null)
    setDragPreview(null)
  }, [draggingItem, petPosition, toast])

  // Handle edit panel item selection
  const handleItemSelect = useCallback((type: 'sticker' | 'accessory', id: string) => {
    setPlacingItem({ type, id })
    // 不關閉倉庫，保持打開狀態
    toast({
      title: '選取物品',
      description: '點擊房間中的位置來放置',
    })
  }, [toast])

  // Handle room click when placing item
  const handleRoomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingItem || !roomRef.current) return

    const rect = roomRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Check if within room bounds
    const roomMinX = 50 / 800
    const roomMaxX = 750 / 800
    const roomMinY = 50 / 600
    const roomMaxY = 550 / 600

    if (x < roomMinX || x > roomMaxX || y < roomMinY || y > roomMaxY) {
      toast({
        title: '無效位置',
        description: '請點擊房間內的位置',
        variant: 'destructive',
      })
      return
    }

    if (placingItem.type === 'sticker') {
      let layer: 'floor' | 'wall-left' | 'wall-right' = 'floor'
      if (x < 0.3) layer = 'wall-left'
      else if (x > 0.7) layer = 'wall-right'
      else if (y > 0.6) layer = 'floor'

      handleDropSticker(placingItem.id, x, y, layer)
    } else if (placingItem.type === 'accessory') {
      const dx = x - petPosition.x
      const dy = y - petPosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 0.25) {
        const relativeX = 0.5 + (x - petPosition.x) / 0.5
        const relativeY = 0.5 + (y - petPosition.y) / 0.5
        const clampedX = Math.min(Math.max(relativeX, 0), 1)
        const clampedY = Math.min(Math.max(relativeY, 0), 1)
        handlePlaceAccessory(placingItem.id, clampedX, clampedY)
      } else {
        toast({
          title: '靠近寵物',
          description: '配件需要放在寵物附近',
          variant: 'destructive',
        })
        return
      }
    }

    setPlacingItem(null)
  }, [placingItem, petPosition, toast])

  // Handle sticker click in edit mode
  const handleStickerClick = useCallback((e: React.MouseEvent, sticker: RoomSticker) => {
    if (!editMode) return
    e.stopPropagation()

    setSelectedItem({ type: 'sticker', id: sticker.id })
    setSelectedItemPosition({
      x: e.clientX,
      y: e.clientY,
    })
  }, [editMode])

  // Handle item rotation
  const handleRotateItem = useCallback(async () => {
    if (!selectedItem) return

    const currentSticker = stickers.find(s => s.id === selectedItem.id)
    if (!currentSticker) return

    const newRotation = (currentSticker.rotation + 45) % 360

    try {
      const res = await fetch(`/api/pet/stickers/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotation: newRotation }),
      })

      if (res.ok) {
        onStickerPlaced?.()
        toast({ title: '已旋轉' })
      }
    } catch (error) {
      toast({ title: '旋轉失敗', variant: 'destructive' })
    }
  }, [selectedItem, stickers, onStickerPlaced, toast])

  // Handle item scale
  const handleScaleItem = useCallback(async () => {
    if (!selectedItem) return

    const currentSticker = stickers.find(s => s.id === selectedItem.id)
    if (!currentSticker) return

    const scales = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = scales.indexOf(currentSticker.scale)
    const newScale = scales[(currentIndex + 1) % scales.length]

    try {
      const res = await fetch(`/api/pet/stickers/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale: newScale }),
      })

      if (res.ok) {
        onStickerPlaced?.()
        toast({ title: `縮放: ${newScale}x` })
      }
    } catch (error) {
      toast({ title: '縮放失敗', variant: 'destructive' })
    }
  }, [selectedItem, stickers, onStickerPlaced, toast])


  const handleDeleteItem = useCallback(async () => {
    if (!selectedItem) return

    await handleDeleteSticker(selectedItem.id)
    setSelectedItem(null)
    setSelectedItemPosition(null)
  }, [selectedItem])

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingItem({ type: 'sticker', id: stickerId })
  }

  const handleFoodDragStart = (event: React.DragEvent<HTMLDivElement>, itemId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'food', itemId }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingItem({ type: 'food', id: itemId })
  }

  const handleAccessoryDragStart = (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'accessory', accessoryId }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingItem({ type: 'accessory', id: accessoryId })
  }

  const handleDragEnd = () => {
    setDraggingItem(null)
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

  const handleDropSticker = async (stickerId: string, positionX: number, positionY: number, layer: 'floor' | 'wall-left' | 'wall-right') => {
    const placementKey = `${stickerId}-${Date.now()}-${Math.random()}`
    
    if (placingStickers.size > 0) {
      return
    }

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
        throw new Error(error.error || '無法放置貼紙')
      }

      toast({
        title: '貼紙已放置！',
        description: '成功添加裝飾到房間',
      })
      onStickerPlaced?.()
    } catch (error: any) {
      toast({
        title: '放置失敗',
        description: error?.message || '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setPlacingStickers(prev => {
        const next = new Set(prev)
        next.delete(placementKey)
        return next
      })
    }
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

    const rect = event.currentTarget.getBoundingClientRect()
    const positionX = (event.clientX - rect.left) / rect.width
    const positionY = (event.clientY - rect.top) / rect.height

    handleDropSticker(stickerId, positionX, positionY, layer)
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
    if (sticker.imageUrl) {
      return { type: 'image' as const, url: sticker.imageUrl };
    }
    const availableSticker = availableStickers.find((s) => s.stickerId === sticker.stickerId);
    if (availableSticker?.imageUrl) {
      return { type: 'image' as const, url: availableSticker.imageUrl };
    }
    return { type: 'emoji' as const, emoji: stickerTypes[sticker.stickerId]?.emoji || '⬛' };
  };

  return (
    <div className="relative w-full h-full flex flex-col lg:flex-row items-start gap-4 min-h-[400px] mt-4 px-2 lg:px-0">
      {/* Edit mode button - opens warehouse panel */}
      <button
        onClick={() => {
          setShowEditPanel(!showEditPanel)
          if (!showEditPanel) {
            // 打開倉庫時自動進入編輯模式
            setEditMode(true)
          }
          setSelectedItem(null)
        }}
        className={`fixed top-20 right-4 z-50 border-2 border-black p-2 lg:p-3 transition-all shadow-lg ${
          showEditPanel 
            ? 'bg-black text-white animate-pulse' 
            : 'bg-white text-black hover:bg-black hover:text-white'
        }`}
        aria-label="開啟倉庫"
        title={showEditPanel ? '倉庫 (點擊關閉)' : '開啟倉庫'}
      >
        <Package className="h-4 w-4 lg:h-5 lg:w-5" />
      </button>


      {/* Warehouse/Edit Panel */}
      <EditPanel
        isOpen={showEditPanel}
        onClose={() => {
          // 關閉倉庫時同時退出編輯模式
          setShowEditPanel(false)
          setEditMode(false)
          setSelectedItem(null)
        }}
        availableStickers={availableStickers}
        onItemSelect={handleItemSelect}
      />

      {/* Item Controls */}
      {selectedItem && selectedItemPosition && editMode && (
        <ItemControls
          position={selectedItemPosition}
          onRotate={handleRotateItem}
          onScale={handleScaleItem}
          onDelete={handleDeleteItem}
        />
      )}

      {/* Placing cursor indicator */}
      {placingItem && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white px-6 py-3 text-sm uppercase tracking-wide border-2 border-white">
          點擊房間來放置物品 | 按 ESC 取消
        </div>
      )}

      {/* Unified drag overlay for all stickers being dragged */}
      {draggingItem && draggingItem.type === 'sticker' && dragPosition && isActuallyDragging && (() => {
        const draggedSticker = stickers.find(s => s.id === draggingItem.id)
        if (!draggedSticker) return null
        const display = getStickerDisplay(draggedSticker)
        return (
          <div
            className="fixed pointer-events-none z-[9999] opacity-90"
            style={{
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              transform: `translate(-50%, -50%) rotate(${draggedSticker.rotation}deg) scale(${draggedSticker.scale * 1.25})`,
            }}
          >
            {display.type === 'image' && !failedImages.has(draggedSticker.id) ? (
              <img
                src={display.url}
                alt="Sticker"
                className="max-w-[60px] max-h-[60px] object-contain"
                draggable={false}
              />
            ) : (
              <span className="text-4xl">{display.emoji}</span>
            )}
          </div>
        )
      })()}

      {/* Room container - shifts left when panel is open */}
      <div className={`flex-1 w-full transition-transform duration-300 ease-in-out ${
        showEditPanel ? 'lg:-translate-x-48' : ''
      }`}>
        {/* Room on left/top - responsive */}
        <div className="flex-1 flex items-start justify-center w-full min-w-0">
          <div 
            ref={roomRef}
            className={`relative w-full max-w-[700px] h-[400px] lg:h-[500px] ${
              placingItem ? 'cursor-crosshair' : ''
            }`}
            onClick={(e) => {
              // 如果點擊房間本身（不是貼紙或選項視窗），處理點擊
              const target = e.target as HTMLElement
              const isClickingSticker = target.closest('[data-sticker-id]')
              const isClickingControls = target.closest('[data-item-controls]')
              
              if (!isClickingSticker && !isClickingControls) {
                if (placingItem) {
                  handleRoomClick(e)
                } else if (selectedItem) {
                  setSelectedItem(null)
                  setSelectedItemPosition(null)
                }
              }
            }}
            title={placingItem ? '點擊此處放置物品' : ''}
          >
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
          className="absolute inset-0 select-none"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
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
              } else if (parsed.type === 'move-sticker') {
                // 標記正在處理 drop
                isProcessingDrop.current = true
                
                // Handle moving existing sticker
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                
                // Room bounds
                const roomMinX = 50 / 800
                const roomMaxX = 750 / 800
                const roomMinY = 50 / 600
                const roomMaxY = 550 / 600
                
                // Check if position is valid
                const isValidPosition = x >= roomMinX && x <= roomMaxX && y >= roomMinY && y <= roomMaxY
                
                if (!isValidPosition) {
                  // 位置不合法，清理拖曳狀態並移回原位置
                  isProcessingDrop.current = false
                  draggingStickerIdRef.current = null
                  setDraggingItem(null)
                  setDragPreview(null)
                  setDragPosition(null)
                  setIsActuallyDragging(false)
                  toast({
                    title: '位置不合法',
                    description: '貼紙只能放置在房間內',
                    variant: 'destructive',
                  })
                  // 刷新數據以確保位置正確
                  onStickerPlaced?.()
                  return
                }
                
                // Clamp to room bounds
                const clampedX = Math.max(roomMinX, Math.min(roomMaxX, x))
                const clampedY = Math.max(roomMinY, Math.min(roomMaxY, y))
                
                // Determine layer
                let layer: 'floor' | 'wall-left' | 'wall-right' = 'floor'
                if (clampedX < 0.3) {
                  layer = 'wall-left'
                } else if (clampedX > 0.7) {
                  layer = 'wall-right'
                } else {
                  layer = 'floor'
                }
                
                // Update sticker position
                const sticker = stickers.find(s => s.id === parsed.stickerId)
                if (sticker) {
                  // 計算新位置的屏幕座標（用於更新選項視窗位置）
                  const newScreenX = rect.left + clampedX * rect.width
                  const newScreenY = rect.top + clampedY * rect.height
                  
                  fetch(`/api/pet/stickers/${parsed.stickerId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      positionX: clampedX,
                      positionY: clampedY,
                      layer,
                    }),
                  })
                    .then(res => {
                      if (res.ok) {
                        // 先刷新數據，讓貼紙出現在新位置
                        onStickerPlaced?.()
                        
                        // 等待數據刷新完成後再清理拖曳狀態
                        // 使用 requestAnimationFrame 確保 DOM 已更新
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            setDraggingItem(null)
                            setDragPreview(null)
                            setDragPosition(null)
                            setIsActuallyDragging(false)
                            draggingStickerIdRef.current = null
                            isProcessingDrop.current = false
                          })
                        })
                        
                        // 如果這個貼紙被選中，更新選項視窗位置
                        if (selectedItem?.type === 'sticker' && selectedItem.id === parsed.stickerId) {
                          setSelectedItemPosition({
                            x: newScreenX,
                            y: newScreenY,
                          })
                        }
                        toast({ title: '物品已移動' })
                      } else {
                        // 移動失敗，清理拖曳狀態並刷新以恢復原位置
                        isProcessingDrop.current = false
                        draggingStickerIdRef.current = null
                        setDraggingItem(null)
                        setDragPreview(null)
                        setDragPosition(null)
                        setIsActuallyDragging(false)
                        toast({ title: '移動失敗', variant: 'destructive' })
                        onStickerPlaced?.() // 刷新以恢復原位置
                      }
                    })
                    .catch(() => {
                      // 移動失敗，清理拖曳狀態並刷新以恢復原位置
                      isProcessingDrop.current = false
                      draggingStickerIdRef.current = null
                      setDraggingItem(null)
                      setDragPreview(null)
                      setDragPosition(null)
                      setIsActuallyDragging(false)
                      toast({ title: '移動失敗', variant: 'destructive' })
                      onStickerPlaced?.() // 刷新以恢復原位置
                    })
                } else {
                  isProcessingDrop.current = false
                }
              } else if (parsed.stickerId) {
                // Regular sticker placement from warehouse
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
              const isSelected = selectedItem?.type === 'sticker' && selectedItem.id === sticker.id
              const isDragging = draggingItem?.type === 'sticker' && draggingItem.id === sticker.id
              const display = getStickerDisplay(sticker)
              
              return (
                <div
                  key={sticker.id}
                  data-sticker-id={sticker.id}
                  className={`absolute select-none ${editMode ? 'cursor-move' : ''} ${
                    isSelected ? 'ring-2 ring-dashed ring-black animate-pulse z-50' : ''
                  } ${isDragging && isActuallyDragging ? 'opacity-0' : ''}`}
                  style={{
                    left: `${sticker.positionX * 100}%`,
                    top: `${sticker.positionY * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                    zIndex: isDragging && isActuallyDragging ? -1 : (isSelected ? 100 : 1 + globalIndex),
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    transition: isDragging && isActuallyDragging ? 'none' : 'none', // 移除 transition，直接出現
                  }}
                  onClick={(e) => {
                    if (editMode && !isDragging) {
                      e.stopPropagation()
                      handleStickerClick(e, sticker)
                    }
                  }}
                  draggable={editMode}
                  onDragStart={(e) => {
                    if (!editMode) {
                      e.preventDefault()
                      return
                    }
                    // 阻止文字選取
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('application/json', JSON.stringify({ 
                      type: 'move-sticker', 
                      stickerId: sticker.id 
                    }))
                    
                    // 取消選中狀態
                    setSelectedItem(null)
                    setSelectedItemPosition(null)
                    
                    // 設置拖曳狀態（但不立即隱藏，等 onDrag 觸發後再隱藏）
                    setDraggingItem({ type: 'sticker', id: sticker.id })
                    setDragPosition({ x: e.clientX, y: e.clientY })
                    setIsActuallyDragging(false) // 初始為 false，等 onDrag 觸發後設為 true
                    draggingStickerIdRef.current = sticker.id // 記錄正在拖曳的貼紙 ID
                    
                    // 為所有類型的貼紙設置拖曳預覽（統一使用自定義覆蓋層）
                    // 創建一個透明的拖曳圖像，這樣瀏覽器默認的拖曳圖像就不會顯示
                    const emptyImg = document.createElement('img')
                    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                    e.dataTransfer.setDragImage(emptyImg, 0, 0)
                    
                    // 設置拖曳預覽數據
                    if (display.type === 'emoji') {
                      setDragPreview({ x: e.clientX, y: e.clientY, emoji: display.emoji })
                    } else if (display.type === 'image') {
                      setDragPreview({ x: e.clientX, y: e.clientY, emoji: '' })
                    }
                  }}
                  onDrag={(e) => {
                    // 在拖曳過程中更新位置，並標記為真正在拖曳
                    if (draggingItem && draggingItem.id === sticker.id) {
                      setIsActuallyDragging(true) // 標記為真正在拖曳
                      setDragPosition({ x: e.clientX, y: e.clientY })
                      if (dragPreview) {
                        setDragPreview({ ...dragPreview, x: e.clientX, y: e.clientY })
                      }
                    }
                  }}
                  onDragEnd={(e) => {
                    // 如果正在處理 drop，不清理狀態（等待 drop 完成）
                    if (isProcessingDrop.current) {
                      return
                    }
                    // 如果沒有正在拖曳的貼紙，立即清理
                    if (!draggingStickerIdRef.current) {
                      setDraggingItem(null)
                      setDragPreview(null)
                      setDragPosition(null)
                      setIsActuallyDragging(false)
                    }
                  }}
                >
                <div
                  className={`relative flex items-center justify-center p-2 rounded ${
                    isSelected ? 'bg-black/10' : ''
                  }`}
                >
                  {display.type === 'image' && !failedImages.has(sticker.id) ? (
                    <img
                      src={display.url}
                      alt="Sticker"
                      className={`max-w-[48px] max-h-[48px] object-contain ${
                        isSelected ? 'scale-110' : ''
                      }`}
                      onError={() => {
                        setFailedImages((prev) => new Set(prev).add(sticker.id))
                      }}
                      draggable={false}
                    />
                  ) : (
                    <span className={`text-3xl ${isSelected ? 'scale-110' : ''}`} draggable={false}>
                      {display.emoji}
                    </span>
                  )}
                </div>
              </div>
            )
            })}
          
          {/* Pet on floor - randomly positioned in bottom trapezoid */}
          {pet && (
            <div
              className={`absolute transition-all duration-[3000ms] ease-in-out cursor-pointer ${draggingItem ? 'scale-105' : 'scale-100'}`}
              style={{
                left: `${petPosition.x * 100}%`,
                top: `${petPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 50,
                transitionProperty: 'left, top, transform',
              }}
              onMouseEnter={() => setShowHandIcon(true)}
              onMouseLeave={() => !isPetting && setShowHandIcon(false)}
              onClick={handlePetPet}
            >
              <div className="relative w-24 h-24 lg:w-32 lg:h-32">
                <Image
                  src={pet.imageUrl || '/cat.jpg'}
                  alt={pet.name}
                  fill
                  sizes="(max-width: 768px) 96px, 128px"
                  priority
                  className="object-contain transition-transform duration-300"
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
      </div>

      {/* Stickers, Food, and Accessories sidebar - hidden, only accessible via warehouse button */}
      <div className="hidden">
        {/* Sticker palette */}
        <div className="relative flex flex-col w-full min-h-[180px] border-2 border-black bg-white px-3 py-2">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2 sticky top-0 bg-white">Stickers</h3>
          {availableStickers.length === 0 && (
            <p className="text-[10px] text-center text-black/40">尚無貼紙</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1">
            {availableStickers.map((sticker) => {
              const stickerEmoji = stickerTypes[sticker.stickerId]?.emoji || sticker.emoji
              return (
                <div
                  key={sticker.stickerId}
                  draggable={sticker.count > 0}
                  onDragStart={(e) => handleDragStart(e, sticker.stickerId, sticker.count)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, 'sticker', sticker.stickerId, stickerEmoji, sticker.count)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
                    sticker.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                  } ${draggingItem?.id === sticker.stickerId ? 'opacity-50' : ''}`}
                >
                  {sticker.imageUrl && !failedImages.has(sticker.stickerId) ? (
                    <div className="relative w-full h-full mb-1 flex items-center justify-center overflow-hidden">
                      <img
                        src={sticker.imageUrl}
                        alt={sticker.name}
                        className="h-8 w-8 lg:h-12 lg:w-12 object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-lg lg:text-xl mb-1">{stickerEmoji}</div>
                  )}
                  <div className="text-[9px] lg:text-[10px] font-semibold uppercase text-center leading-tight line-clamp-1">{sticker.name}</div>
                  <div className="text-[9px] lg:text-[10px] text-black/60">x{sticker.count}</div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-center text-black/40 mt-2">
            拖拉貼紙到房間
          </p>
        </div>

        {/* Food palette */}
        <div className="relative flex flex-col w-full min-h-[180px] border-2 border-black bg-white px-3 py-2">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2 sticky top-0 bg-white">Food</h3>
          {foodItems.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1">
                {foodItems.map((food) => (
                  <div
                    key={food.itemId}
                    draggable={food.count > 0}
                    onDragStart={(e) => handleFoodDragStart(e, food.itemId, food.count)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, 'food', food.itemId, food.emoji, food.count)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
                      food.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    } ${draggingItem?.id === food.itemId ? 'opacity-50' : ''}`}
                  >
                    <div className="relative w-full h-full mb-1 flex items-center justify-center">
                      <span className="text-lg lg:text-xl">{food.emoji}</span>
                    </div>
                    <div className="text-[9px] lg:text-[10px] font-semibold uppercase text-center leading-tight line-clamp-1">{food.name}</div>
                    <div className="text-[9px] lg:text-[10px] text-black/60">x{food.count}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-black/40 mt-2">
                拖拉食物到寵物處
              </p>
            </>
          ) : (
            <p className="text-[11px] lg:text-[12px] text-center text-black/40 mt-6 uppercase tracking-wide">
              尚無食物 — 前往商店購買！
            </p>
          )}
        </div>

        {/* Accessories palette */}
        <div className="relative flex flex-col w-full min-h-[180px] border-2 border-black bg-white px-3 py-2">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2 sticky top-0 bg-white">Accessories</h3>
          {availableAccessories.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1">
                {availableAccessories.map((accessory) => (
                  <div
                    key={accessory.accessoryId}
                    draggable={accessory.count > 0}
                    onDragStart={(e) => handleAccessoryDragStart(e, accessory.accessoryId, accessory.count)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, 'accessory', accessory.accessoryId, accessory.emoji, accessory.count)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`aspect-square border-2 border-black p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
                      accessory.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    } ${draggingItem?.id === accessory.accessoryId ? 'opacity-50' : ''}`}
                  >
                    <div className="relative w-full h-full mb-1 flex items-center justify-center">
                      {accessory.imageUrl && !failedImages.has(accessory.accessoryId) ? (
                        <img
                          src={accessory.imageUrl}
                          alt={accessory.name}
                          className="max-w-[18px] max-h-[18px] lg:max-w-[24px] lg:max-h-[24px] object-contain"
                          onError={() => {
                            setFailedImages((prev) => new Set(prev).add(accessory.accessoryId))
                          }}
                        />
                      ) : (
                        <span className="text-lg lg:text-xl">{accessory.emoji}</span>
                      )}
                    </div>
                    <div className="text-[9px] lg:text-[10px] font-semibold uppercase text-center leading-tight line-clamp-1">{accessory.name}</div>
                    <div className="text-[9px] lg:text-[10px] text-black/60">x{accessory.count}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-black/40 mt-2">
                拖拉配件到寵物處
              </p>
            </>
          ) : (
            <p className="text-[11px] lg:text-[12px] text-center text-black/40 mt-6 uppercase tracking-wide">
              尚無配件 — 前往商店購買！
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
