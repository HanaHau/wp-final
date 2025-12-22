'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Edit3, Heart, ShoppingCart } from 'lucide-react'
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
  imageUrl?: string | null // For custom stickers
}

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
  showEditPanel?: boolean
  onEditPanelChange?: (open: boolean) => void
  onStickerPlaced?: () => void
  onPetFed?: () => void
  onAccessoryPlaced?: () => void
  onPetUpdate?: (pet: Pet) => void // 用於樂觀更新 pet 狀態
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

export default function Room({ pet, stickers = [], availableStickers = [], foodItems = [], accessories = [], availableAccessories = [], showEditPanel: externalShowEditPanel, onEditPanelChange, onStickerPlaced, onPetFed, onAccessoryPlaced, onPetUpdate }: RoomProps) {
  const [hoveredStickerId, setHoveredStickerId] = useState<string | null>(null)
  const { toast } = useToast()
  const [placingStickers, setPlacingStickers] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [feeding, setFeeding] = useState(false)
  const [petPosition, setPetPosition] = useState({ x: 0.5, y: 0.75 })
  const [isPetting, setIsPetting] = useState(false)
  const [showPetTooltip, setShowPetTooltip] = useState(false)
  const [hearts, setHearts] = useState<Array<{ id: string; x: number; y: number }>>([])
  const [isMoving, setIsMoving] = useState(false)
  const [currentMoveDirection, setCurrentMoveDirection] = useState<'left' | 'right' | null>(null)
  const petFacingDirection = (pet?.facingDirection || 'right') as 'left' | 'right'
  const pettingTimeout = useRef<NodeJS.Timeout | null>(null)
  const moveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentTargetRef = useRef({ x: 0.5, y: 0.75 })
  const petImageRef = useRef<HTMLDivElement>(null)
  const recentDirectionsRef = useRef<('left' | 'right')[]>([])
  
  // 樂觀更新：本地貼紙狀態（用於即時 UI 更新）
  const [optimisticStickers, setOptimisticStickers] = useState<RoomSticker[]>(stickers)
  const updateDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pendingUpdatesRef = useRef<Map<string, Partial<RoomSticker>>>(new Map())
  
  // 樂觀更新：本地可用貼紙狀態（用於即時更新倉庫計數）
  const [optimisticAvailableStickers, setOptimisticAvailableStickers] = useState<AvailableSticker[]>(availableStickers)
  
  // 樂觀更新：本地可用配件狀態（用於即時更新倉庫計數）
  const [optimisticAvailableAccessories, setOptimisticAvailableAccessories] = useState<AvailableAccessory[]>(availableAccessories || [])
  
  // 當 props.stickers 更新時，同步到樂觀狀態（但保留未完成的樂觀更新）
  useEffect(() => {
    setOptimisticStickers((prev) => {
      // 合併 props 的更新和未完成的樂觀更新
      const optimisticMap = new Map(prev.map(s => [s.id, s]))
      stickers.forEach((sticker) => {
        // 如果沒有待處理的更新，使用 props 的值
        if (!pendingUpdatesRef.current.has(sticker.id)) {
          optimisticMap.set(sticker.id, sticker)
        }
      })
      return Array.from(optimisticMap.values())
    })
  }, [stickers])
  
  // 當 props.availableStickers 更新時，同步到樂觀狀態
  useEffect(() => {
    setOptimisticAvailableStickers(availableStickers)
  }, [availableStickers])
  
  // 當 props.availableAccessories 更新時，同步到樂觀狀態
  useEffect(() => {
    setOptimisticAvailableAccessories(availableAccessories || [])
  }, [availableAccessories])
  
  const [editMode, setEditMode] = useState(false)
  const [internalShowEditPanel, setInternalShowEditPanel] = useState(false)
  const showEditPanel = externalShowEditPanel !== undefined ? externalShowEditPanel : internalShowEditPanel
  const setShowEditPanel = onEditPanelChange || setInternalShowEditPanel
  const [selectedItem, setSelectedItem] = useState<{ type: 'sticker' | 'accessory'; id: string } | null>(null)
  const [selectedItemPosition, setSelectedItemPosition] = useState<{ x: number; y: number } | null>(null)
  
  // 檢查選中的貼紙是否仍然存在，如果不存在則清除選中狀態
  useEffect(() => {
    if (selectedItem?.type === 'sticker') {
      const stickerExists = optimisticStickers.some(s => s.id === selectedItem.id)
      if (!stickerExists) {
        setSelectedItem(null)
        setSelectedItemPosition(null)
      }
    }
  }, [optimisticStickers, selectedItem])
  const [draggingItem, setDraggingItem] = useState<{ type: string; id: string } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; emoji: string } | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [isActuallyDragging, setIsActuallyDragging] = useState(false)
  const isProcessingDrop = useRef(false)
  const draggingStickerIdRef = useRef<string | null>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const [justPlaced, setJustPlaced] = useState<string | null>(null)

  // Track if position has been initialized
  const positionInitializedRef = useRef(false)

  // Optimized pet movement with smooth transitions and natural behavior
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
    // Uses the same room bounds as stickers to ensure pet stays inside the irregular room shape
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
      
      // Get actual pet image dimensions to ensure edges don't go outside room
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
        // Ultimate fallback
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
      // Since we use translate(-50%, -50%), the position is the center of the pet
      // We need to ensure the pet's edges don't go outside the room bounds
      const minX = roomMinX + petWidthRatio / 2  // Left edge: pet center must be at least petWidth/2 from room left edge
      const maxX = roomMaxX - petWidthRatio / 2  // Right edge: pet center must be at most roomMaxX - petWidth/2
      const minY = roomMinY + petHeightRatio / 2  // Top edge: pet center must be at least petHeight/2 from room top edge
      const maxY = roomMaxY - petHeightRatio / 2  // Bottom edge: pet center must be at most roomMaxY - petHeight/2
      
      // Further constrain to floor area (bottom part of room where pet should be)
      const floorMinX = 0.2
      const floorMaxX = 0.8
      const floorMinY = 0.65
      
      // Use the more restrictive bounds (intersection of image bounds, room bounds, and floor area)
      const finalMinX = Math.max(minX, floorMinX)
      const finalMaxX = Math.min(maxX, floorMaxX)
      const finalMinY = Math.max(minY, floorMinY)
      const finalMaxY = maxY  // Use roomMaxY (already accounts for pet height)
      
      // Wandering behavior: move in a direction with some randomness
      // This creates more natural wandering instead of teleporting
      
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

    // Start the movement cycle after initial delay (faster start)
    const initialDelay = 200 + Math.random() * 300 // 0.2-0.5 second
    moveIntervalRef.current = setTimeout(() => {
      scheduleNextMove()
    }, initialDelay)

    return () => {
      if (moveIntervalRef.current) {
        clearTimeout(moveIntervalRef.current)
      }
    }
  }, [pet])

  // 當打開倉庫時自動進入編輯模式
  useEffect(() => {
    if (showEditPanel) {
      setEditMode(true)
    } else {
      setEditMode(false)
      setSelectedItem(null)
    }
  }, [showEditPanel])

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

  // ESC key to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItem) {
          setSelectedItem(null)
          setSelectedItemPosition(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  // Track mouse position during drag (fallback for browsers that don't fire onDrag)
  useEffect(() => {
    if (!draggingItem) return

    const handleMouseMove = (e: MouseEvent) => {
      // 持續更新拖曳位置，讓物件跟隨游標
      setDragPosition({ x: e.clientX, y: e.clientY })
      // Update drag preview for emoji stickers
      if (dragPreview) {
        setDragPreview({ ...dragPreview, x: e.clientX, y: e.clientY })
      }
    }

    // 使用 capture phase 確保能捕獲到事件
    // 同時監聽 document 級別的事件，確保即使游標移出元素也能追蹤
    document.addEventListener('mousemove', handleMouseMove, true)
    window.addEventListener('mousemove', handleMouseMove, true)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true)
      window.removeEventListener('mousemove', handleMouseMove, true)
    }
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
            title: 'Get closer to pet',
            description: 'Drag food near the pet to feed',
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
          
          // 立即清理拖放狀態，讓配件立即顯示（樂觀更新）
          setDraggingItem(null)
          setDragPreview(null)
          setDragPosition(null)
          setIsActuallyDragging(false)
          
          // 調用 handlePlaceAccessory（已經有樂觀更新，會立即顯示配件）
          handlePlaceAccessory(draggingItem.id, clampedX, clampedY)
        } else {
          toast({
            title: 'Get closer to pet',
            description: 'Drag accessory near the pet to equip',
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
            title: 'Invalid placement',
            description: 'Stickers can only be placed inside the room',
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

  // 防抖更新函數：批量處理更新請求
  const debouncedUpdateSticker = useCallback((stickerId: string, updates: Partial<RoomSticker>) => {
    // 清除之前的防抖計時器
    const existingTimer = updateDebounceRef.current.get(stickerId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 保存待處理的更新
    pendingUpdatesRef.current.set(stickerId, {
      ...pendingUpdatesRef.current.get(stickerId),
      ...updates,
    })

    // 立即更新樂觀狀態
    setOptimisticStickers((prev) =>
      prev.map((s) =>
        s.id === stickerId ? { ...s, ...updates } : s
      )
    )

    // 設置防抖計時器（300ms 後發送 API 請求）
    const timer = setTimeout(async () => {
      const finalUpdates = pendingUpdatesRef.current.get(stickerId)
      if (!finalUpdates) return

      try {
        const res = await fetch(`/api/pet/stickers/${stickerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalUpdates),
        })

        if (res.ok) {
          // 清除待處理的更新
          pendingUpdatesRef.current.delete(stickerId)
          // 觸發數據刷新（可選，因為樂觀更新已經顯示了）
          onStickerPlaced?.()
        } else {
          // 如果失敗，恢復原始狀態
          const originalSticker = stickers.find(s => s.id === stickerId)
          if (originalSticker) {
            setOptimisticStickers((prev) =>
              prev.map((s) => (s.id === stickerId ? originalSticker : s))
            )
          }
          throw new Error('Update failed')
        }
      } catch (error) {
        // 恢復原始狀態
        const originalSticker = stickers.find(s => s.id === stickerId)
        if (originalSticker) {
          setOptimisticStickers((prev) =>
            prev.map((s) => (s.id === stickerId ? originalSticker : s))
          )
        }
        pendingUpdatesRef.current.delete(stickerId)
      } finally {
        updateDebounceRef.current.delete(stickerId)
      }
    }, 300)

    updateDebounceRef.current.set(stickerId, timer)
  }, [stickers, onStickerPlaced])

  // Handle item rotation
  const handleRotateItem = useCallback(async () => {
    if (!selectedItem) return

    const currentSticker = optimisticStickers.find(s => s.id === selectedItem.id)
    if (!currentSticker) return

    const newRotation = (currentSticker.rotation + 45) % 360

    // 使用防抖更新
    debouncedUpdateSticker(selectedItem.id, { rotation: newRotation })
    toast({ title: 'Rotated' })
  }, [selectedItem, optimisticStickers, debouncedUpdateSticker, toast])

  // Handle item scale
  const handleScaleItem = useCallback(async () => {
    if (!selectedItem) return

    const currentSticker = optimisticStickers.find(s => s.id === selectedItem.id)
    if (!currentSticker) return

    const scales = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = scales.indexOf(currentSticker.scale)
    const newScale = scales[(currentIndex + 1) % scales.length]

    // 使用防抖更新
    debouncedUpdateSticker(selectedItem.id, { scale: newScale })
    toast({ title: `Scale: ${newScale}x` })
  }, [selectedItem, optimisticStickers, debouncedUpdateSticker, toast])


  const handleDeleteItem = useCallback(async () => {
    if (!selectedItem) return

    await handleDeleteSticker(selectedItem.id)
    setSelectedItem(null)
    setSelectedItemPosition(null)
  }, [selectedItem])

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => {
    if (count <= 0) return
    
    // 找到對應的貼紙
    const availableSticker = availableStickers.find(s => s.stickerId === stickerId)
    const stickerType = STICKER_TYPES[stickerId]
    const emoji = availableSticker?.emoji || stickerType?.emoji || '⬛'
    
    // 創建自定義拖曳圖像，類似 DecorPanel 的方式，讓物件跟隨游標
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.left = '-1000px'
    dragImage.style.width = '64px'
    dragImage.style.height = '64px'
    dragImage.style.display = 'flex'
    dragImage.style.alignItems = 'center'
    dragImage.style.justifyContent = 'center'
    
    if (availableSticker?.imageUrl && !failedImages.has(stickerId)) {
      dragImage.innerHTML = `<img src="${availableSticker.imageUrl}" style="width: 64px; height: 64px; object-contain;" />`
    } else {
      dragImage.innerHTML = `<span style="font-size: 48px;">${emoji}</span>`
    }
    
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 32, 32)
    
    // 設置拖曳數據
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.dropEffect = 'copy'
    
    // 清理臨時元素
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
    
    // 設置拖曳狀態（用於視覺反饋，但主要使用瀏覽器原生拖曳圖像）
    setDraggingItem({ type: 'sticker', id: stickerId })
    setDragPosition({ x: event.clientX, y: event.clientY })
    setDragPreview({ x: event.clientX, y: event.clientY, emoji })
    setIsActuallyDragging(true)
  }

  const handleFoodDragStart = (event: React.DragEvent<HTMLDivElement>, itemId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'food', itemId }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingItem({ type: 'food', id: itemId })
    setDragPosition({ x: event.clientX, y: event.clientY })
    
    // Set drag preview for food
    const foodItem = foodItems.find(f => f.itemId === itemId)
    const emoji = foodItem?.emoji || '🍎'
    
    // Create empty drag image to use custom preview
    const emptyImg = document.createElement('img')
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    event.dataTransfer.setDragImage(emptyImg, 0, 0)
    
    setDragPreview({ x: event.clientX, y: event.clientY, emoji })
    setIsActuallyDragging(true)
  }

  const handleAccessoryDragStart = (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'accessory', accessoryId }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingItem({ type: 'accessory', id: accessoryId })
    setDragPosition({ x: event.clientX, y: event.clientY })
    
    // Set drag preview for accessory
    const availableAccessory = optimisticAvailableAccessories.find(a => a.accessoryId === accessoryId)
    const shopItem = SHOP_ITEM_MAP[accessoryId]
    const emoji = availableAccessory?.emoji || shopItem?.emoji || '🎀'
    
    // Create empty drag image to use custom preview
    const emptyImg = document.createElement('img')
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    event.dataTransfer.setDragImage(emptyImg, 0, 0)
    
    setDragPreview({ x: event.clientX, y: event.clientY, emoji })
    setIsActuallyDragging(true)
  }

  const handleDragEnd = () => {
    setDraggingItem(null)
    setDragPreview(null)
    setDragPosition(null)
    setIsActuallyDragging(false)
  }

  // 樂觀更新：本地配件狀態
  const [optimisticAccessories, setOptimisticAccessories] = useState<PetAccessory[]>(accessories)
  
  // 當 props.accessories 更新時，同步到樂觀狀態
  useEffect(() => {
    setOptimisticAccessories(accessories)
  }, [accessories])

  const handlePlaceAccessory = async (accessoryId: string, positionX: number, positionY: number) => {
    // 樂觀更新：立即添加臨時配件
    const tempAccessory: PetAccessory = {
      id: `temp-${Date.now()}`,
      accessoryId,
      positionX,
      positionY,
      rotation: 0,
      scale: 1,
    }
    setOptimisticAccessories((prev) => [...prev, tempAccessory])
    
    // 樂觀更新：立即減少倉庫中的配件計數
    setOptimisticAvailableAccessories((prev) =>
      prev.map((a) =>
        a.accessoryId === accessoryId && a.count > 0
          ? { ...a, count: a.count - 1 }
          : a
      )
    )
    
    // 立即顯示 toast（樂觀更新）
    toast({
      title: 'Accessory equipped!',
      description: 'Successfully added accessory to pet',
    })

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
        const data = await res.json()
        // 用真實數據替換臨時配件
        setOptimisticAccessories((prev) =>
          prev.map((a) => (a.id === tempAccessory.id ? data : a))
        )
        if (onAccessoryPlaced) {
          onAccessoryPlaced()
        }
      } else {
        const error = await res.json()
        // 如果失敗，移除臨時配件並恢復倉庫計數
        setOptimisticAccessories((prev) => prev.filter((a) => a.id !== tempAccessory.id))
        setOptimisticAvailableAccessories((prev) =>
          prev.map((a) =>
            a.accessoryId === accessoryId
              ? { ...a, count: a.count + 1 }
              : a
          )
        )
        toast({
          title: 'Failed to place accessory',
          description: error.error || 'Please try again',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Place accessory error:', error)
      // 如果失敗，移除臨時配件並恢復倉庫計數
      setOptimisticAccessories((prev) => prev.filter((a) => a.id !== tempAccessory.id))
      setOptimisticAvailableAccessories((prev) =>
        prev.map((a) =>
          a.accessoryId === accessoryId
            ? { ...a, count: a.count + 1 }
            : a
        )
      )
      toast({
        title: 'Failed to place accessory',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveAccessory = async (accessoryId: string) => {
    // 樂觀更新：立即移除配件
    const removedAccessory = optimisticAccessories.find(a => a.id === accessoryId)
    setOptimisticAccessories((prev) => prev.filter((a) => a.id !== accessoryId))
    
    // 樂觀更新：立即增加倉庫中的配件計數
    setOptimisticAvailableAccessories((prev) =>
      prev.map((a) =>
        a.accessoryId === removedAccessory?.accessoryId
          ? { ...a, count: a.count + 1 }
          : a
      )
    )

    try {
      const res = await fetch(`/api/pet/accessories/${accessoryId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to remove accessory')
      }

      if (onAccessoryPlaced) {
        onAccessoryPlaced()
      }
    } catch (error) {
      // 如果失敗，恢復配件並回滾倉庫計數
      if (removedAccessory) {
        setOptimisticAccessories((prev) => [...prev, removedAccessory])
        setOptimisticAvailableAccessories((prev) =>
          prev.map((a) =>
            a.accessoryId === removedAccessory.accessoryId
              ? { ...a, count: Math.max(0, a.count - 1) }
              : a
          )
        )
      }
      console.error('Remove accessory error:', error)
      toast({
        title: 'Failed to remove accessory',
        description: 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const handleFeedPet = async (itemId: string): Promise<void> => {
    if (feeding) return Promise.resolve()
    setFeeding(true)

    // 計算預期的 fullnessGain（樂觀更新）
    let expectedFullnessGain: number
    if (itemId.startsWith('custom-')) {
      expectedFullnessGain = 10 // 預設值，API 會返回實際值
    } else {
      const item = SHOP_ITEM_MAP[itemId]
      expectedFullnessGain = item?.fullnessRecovery ?? item?.cost ?? 10
    }

    // 樂觀更新：立即顯示 toast（加速用戶體驗）
    toast({
      title: 'Pet fed!',
      description: `Fullness +${expectedFullnessGain}`,
    })

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
      // 如果實際值與預期不同，更新 toast（但通常不會發生）
      if (data.fullnessGain !== expectedFullnessGain) {
        toast({
          title: data.message || 'Pet fed!',
          description: `Fullness +${data.fullnessGain}`,
        })
      }
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
    if (isPetting || !pet) return
    setIsPetting(true)
    setShowPetTooltip(false)
    if (pettingTimeout.current) {
      clearTimeout(pettingTimeout.current)
    }

    // 樂觀更新：立即更新 mood 和顯示 toast（加速用戶體驗）
    const moodIncrease = 2 // 每次撫摸 +2
    const previousMood = pet.mood
    const newMood = Math.min(100, pet.mood + moodIncrease)
    
    // 立即更新 pet 狀態（樂觀更新）
    if (onPetUpdate && pet) {
      onPetUpdate({
        ...pet,
        mood: newMood,
      })
    }
    
    // 立即顯示 toast（樂觀更新）
    const messages = [
      'Aww, that feels nice! 🥰',
      'I love being petted! 💕',
      'More please! 😊',
      'You\'re the best! ❤️',
      'So happy! 🎉',
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    
    toast({
      title: randomMessage,
      description: `Mood +${moodIncrease}`,
    })

    // 產生愛心特效
    if (petImageRef.current) {
      const rect = petImageRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // 產生多個愛心，從寵物中心向上飄散
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: `heart-${Date.now()}-${i}`,
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
      }))
      
      setHearts(newHearts)
      
      // 清除愛心特效
      setTimeout(() => {
        setHearts([])
      }, 2000)
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
      // 如果實際值與預期不同，更新 pet 狀態（但通常不會發生，因為 moodGain 是固定的 +2）
      if (data.pet && onPetUpdate) {
        onPetUpdate(data.pet)
      }
      // 注意：不更新 toast，因為已經顯示了
      onPetFed?.()
    } catch (error: any) {
      // 回滾樂觀更新
      if (onPetUpdate && pet) {
        onPetUpdate({
          ...pet,
          mood: previousMood, // 恢復之前的 mood
        })
      }
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
    event.stopPropagation()
    // Chrome 在 onDragOver 中無法讀取 getData，所以根據 draggingItem 狀態判斷
    // 如果有 draggingItem 且是 move-sticker，使用 'move'，否則使用 'copy'
    if (draggingItem?.type === 'sticker') {
      // 檢查是否是移動現有貼紙（在 stickers 中找到）
      const isMovingExisting = stickers.some(s => s.id === draggingItem.id)
      event.dataTransfer.dropEffect = isMovingExisting ? 'move' : 'copy'
    } else {
    event.dataTransfer.dropEffect = 'copy'
  }
  }

  const handleDropSticker = async (stickerId: string, positionX: number, positionY: number, layer: 'floor' | 'wall-left' | 'wall-right') => {
    const placementKey = `${stickerId}-${Date.now()}-${Math.random()}`
    
    if (placingStickers.size > 0) {
      return
    }

    const clampedX = Math.min(Math.max(positionX, 0), 1)
    const clampedY = Math.min(Math.max(positionY, 0), 1)

    // 樂觀更新：立即添加臨時貼紙
    const tempSticker: RoomSticker = {
      id: `temp-${Date.now()}`,
      stickerId,
      positionX: clampedX,
      positionY: clampedY,
      rotation: 0,
      scale: 1,
      layer,
    }
    setOptimisticStickers((prev) => [...prev, tempSticker])
    
    // 樂觀更新：立即減少倉庫中的貼紙計數
    setOptimisticAvailableStickers((prev) =>
      prev.map((s) =>
        s.stickerId === stickerId && s.count > 0
          ? { ...s, count: s.count - 1 }
          : s
      )
    )
    
    setPlacingStickers(prev => new Set(prev).add(placementKey))

    try {
      const res = await fetch('/api/pet/stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stickerId,
          positionX: clampedX,
          positionY: clampedY,
          layer,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to place sticker')
      }

      const data = await res.json()
      
      // 用真實數據替換臨時貼紙
      setOptimisticStickers((prev) =>
        prev.map((s) => (s.id === tempSticker.id ? data : s))
      )
      
      toast({
        title: 'Sticker placed!',
        description: 'Successfully added decoration to room',
      })
      
      // 觸發數據刷新（可選，因為樂觀更新已經顯示了）
      onStickerPlaced?.()
    } catch (error: any) {
      // 如果失敗，移除臨時貼紙並恢復倉庫計數
      setOptimisticStickers((prev) => prev.filter((s) => s.id !== tempSticker.id))
      setOptimisticAvailableStickers((prev) =>
        prev.map((s) =>
          s.stickerId === stickerId
            ? { ...s, count: s.count + 1 }
            : s
        )
      )
      toast({
        title: 'Placement failed',
        description: error?.message || 'Please try again later',
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
    // 樂觀更新：立即從 UI 中移除
    const deletedSticker = optimisticStickers.find(s => s.id === stickerId)
    setOptimisticStickers((prev) => prev.filter(s => s.id !== stickerId))
    
    // 如果被刪除的貼紙是當前選中的，立即清除選中狀態（讓按鈕消失）
    if (selectedItem?.type === 'sticker' && selectedItem.id === stickerId) {
      setSelectedItem(null)
      setSelectedItemPosition(null)
    }
    
    // 樂觀更新：立即增加倉庫中的貼紙計數
    if (deletedSticker) {
      setOptimisticAvailableStickers((prev) =>
        prev.map((s) =>
          s.stickerId === deletedSticker.stickerId
            ? { ...s, count: s.count + 1 }
            : s
        )
      )
    }
    
    // 清除相關的防抖計時器和待處理更新
    const timer = updateDebounceRef.current.get(stickerId)
    if (timer) {
      clearTimeout(timer)
      updateDebounceRef.current.delete(stickerId)
    }
    pendingUpdatesRef.current.delete(stickerId)

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
      // 如果失敗，恢復貼紙並減少倉庫計數
      if (deletedSticker) {
        setOptimisticStickers((prev) => [...prev, deletedSticker])
        setOptimisticAvailableStickers((prev) =>
          prev.map((s) =>
            s.stickerId === deletedSticker.stickerId && s.count > 0
              ? { ...s, count: s.count - 1 }
              : s
          )
        )
      }
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
      {/* Warehouse/Edit Panel */}
      <EditPanel
        isOpen={showEditPanel}
        onClose={() => {
          // 關閉倉庫時同時退出編輯模式
          setShowEditPanel(false)
          if (onEditPanelChange) {
            onEditPanelChange(false)
          }
          setEditMode(false)
          setSelectedItem(null)
        }}
        availableStickers={optimisticAvailableStickers}
        foodItems={foodItems}
        availableAccessories={optimisticAvailableAccessories}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onFoodDragStart={handleFoodDragStart}
        onAccessoryDragStart={handleAccessoryDragStart}
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

      {/* Unified drag overlay for all stickers being dragged - only show for existing stickers being moved */}
      {draggingItem && draggingItem.type === 'sticker' && dragPosition && (() => {
        // Check if it's an existing sticker in the room
        const draggedSticker = stickers.find(s => s.id === draggingItem.id)
        
        // Only show overlay for existing stickers being moved, not for new stickers from EditPanel
        // New stickers use browser's native drag image which follows cursor
        if (draggedSticker) {
          // Existing sticker being moved
          const display = getStickerDisplay(draggedSticker)
  return (
            <div
              className="fixed pointer-events-none z-[9999] opacity-90 animate-drag-glow"
              style={{
                left: `${dragPosition.x}px`,
                top: `${dragPosition.y}px`,
                transform: `translate(-50%, -50%) rotate(${draggedSticker.rotation}deg) scale(${draggedSticker.scale * 1.3})`,
                filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
                transition: 'none', // No transition for smooth following
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
        }
        // Don't show overlay for new stickers - use browser's native drag image
        return null
      })()}

      {/* Drag overlay for food items */}
      {draggingItem && draggingItem.type === 'food' && dragPosition && (() => {
        const foodItem = foodItems.find(f => f.itemId === draggingItem.id)
        const emoji = foodItem?.emoji || '🍎'
        
        return (
          <div
            className="fixed pointer-events-none z-[9999] opacity-90 animate-drag-glow"
            style={{
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              transform: `translate(-50%, -50%) scale(1.3)`,
              filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
              transition: 'none', // No transition for smooth following
            }}
          >
            <span className="text-4xl">{emoji}</span>
          </div>
        )
      })()}

      {/* Drag overlay for accessories */}
      {draggingItem && draggingItem.type === 'accessory' && dragPosition && (() => {
        const availableAccessory = optimisticAvailableAccessories.find(a => a.accessoryId === draggingItem.id)
        const shopItem = SHOP_ITEM_MAP[draggingItem.id]
        const emoji = availableAccessory?.emoji || shopItem?.emoji || '🎀'
        
        return (
          <div
            className="fixed pointer-events-none z-[9999] opacity-90 animate-drag-glow"
            style={{
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              transform: `translate(-50%, -50%) scale(1.3)`,
              filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))',
              transition: 'none', // No transition for smooth following
            }}
          >
            {availableAccessory?.imageUrl && !failedImages.has(draggingItem.id) ? (
              <img
                src={availableAccessory.imageUrl}
                alt="Accessory"
                className="max-w-[60px] max-h-[60px] object-contain"
                draggable={false}
              />
            ) : (
              <span className="text-4xl">{emoji}</span>
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
            className="relative w-full max-w-[700px] h-[400px] lg:h-[500px]"
            onClick={(e) => {
              // 如果點擊房間本身（不是貼紙或選項視窗），處理點擊
              const target = e.target as HTMLElement
              const isClickingSticker = target.closest('[data-sticker-id]')
              const isClickingControls = target.closest('[data-item-controls]')
              
              if (!isClickingSticker && !isClickingControls) {
                if (selectedItem) {
                  setSelectedItem(null)
                  setSelectedItemPosition(null)
                }
              }
            }}
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
            // Chrome 需要明確阻止默認行為和冒泡
            e.preventDefault()
            e.stopPropagation()
            
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
                  handleFeedPet(parsed.itemId).finally(() => {
                    // Clean up drag state after feeding
                    setDraggingItem(null)
                    setDragPreview(null)
                    setDragPosition(null)
                    setIsActuallyDragging(false)
                  })
                  return
                }
                // Clean up drag state on invalid drop
                setDraggingItem(null)
                setDragPreview(null)
                setDragPosition(null)
                setIsActuallyDragging(false)
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

                  // 立即清理拖放狀態，讓配件立即顯示（樂觀更新）
                  setDraggingItem(null)
                  setDragPreview(null)
                  setDragPosition(null)
                  setIsActuallyDragging(false)

                  // 調用 handlePlaceAccessory（已經有樂觀更新，會立即顯示配件）
                  handlePlaceAccessory(parsed.accessoryId, clampedX, clampedY)
                  return
                }
                // Clean up drag state on invalid drop
                setDraggingItem(null)
                setDragPreview(null)
                setDragPosition(null)
                setIsActuallyDragging(false)
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
                    title: 'Invalid position',
                    description: 'Stickers can only be placed inside the room',
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
                
                // Update sticker position (使用樂觀更新)
                const sticker = optimisticStickers.find(s => s.id === parsed.stickerId)
                if (sticker) {
                  // 計算新位置的屏幕座標（用於更新選項視窗位置）
                  const newScreenX = rect.left + clampedX * rect.width
                  const newScreenY = rect.top + clampedY * rect.height
                  
                  // 使用防抖更新（樂觀更新）
                  debouncedUpdateSticker(parsed.stickerId, {
                    positionX: clampedX,
                    positionY: clampedY,
                    layer,
                  })
                  
                  // 立即清理拖曳狀態（因為樂觀更新已經顯示了新位置）
                  isProcessingDrop.current = false
                  draggingStickerIdRef.current = null
                  setDraggingItem(null)
                  setDragPreview(null)
                  setDragPosition(null)
                  setIsActuallyDragging(false)
                  
                  // 如果這個貼紙被選中，更新選項視窗位置
                  if (selectedItem?.type === 'sticker' && selectedItem.id === parsed.stickerId) {
                    setSelectedItemPosition({
                      x: newScreenX,
                      y: newScreenY,
                    })
                  }
                } else {
                  isProcessingDrop.current = false
                }
              } else if (parsed.stickerId) {
                // Regular sticker placement from warehouse (EditPanel)
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
                  // Clean up drag state on invalid drop
                  setDraggingItem(null)
                  setDragPreview(null)
                  setDragPosition(null)
                  setIsActuallyDragging(false)
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
                
                // Immediately clean up drag state to prevent visual jump (similar to accessory)
                setDraggingItem(null)
                setDragPreview(null)
                setDragPosition(null)
                setIsActuallyDragging(false)
                
                // 記錄放置位置，用於後續驗證
                const dropPosition = { x, y, layer }
                
                // Place the sticker (clean state first, then place - like accessory)
                handleDropSticker(parsed.stickerId, x, y, layer)
              }
            } catch (error) {
              console.error('Invalid drop data:', error)
            }
          }}
        >
          {/* All stickers - positioned absolutely within the room */}
          {optimisticStickers.map((sticker) => {
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
                  } ${isDragging && isActuallyDragging ? 'opacity-0' : ''} ${
                    justPlaced === sticker.id ? 'animate-place-bounce' : ''
                  } ${isDragging ? 'animate-drag-glow' : ''}`}
                  style={{
                    left: `${sticker.positionX * 100}%`,
                    top: `${sticker.positionY * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                    zIndex: isDragging && isActuallyDragging ? -1 : (isSelected ? 100 : 1 + globalIndex),
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    transition: isDragging && isActuallyDragging 
                      ? 'none' 
                      : justPlaced === sticker.id
                      ? 'none' // Animation handles the transition
                      : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isDragging 
                      ? 'drop-shadow(0 10px 25px rgba(0,0,0,0.4))' 
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
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
                    
                    // Chrome 需要明確設置這些屬性
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.dropEffect = 'move'
                    
                    // 設置拖曳數據
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
                    
                    // Chrome 需要明確阻止默認行為
                    e.stopPropagation()
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
                    // Chrome 需要明確阻止默認行為
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDragEnd={(e) => {
                    // Chrome 需要明確阻止默認行為
                    e.preventDefault()
                    e.stopPropagation()
                    
                    // 如果正在處理 drop，不清理狀態（等待 drop 完成）
                    if (isProcessingDrop.current) {
                      return
                    }
                    
                    // 清理拖曳狀態
                    draggingStickerIdRef.current = null
                    setDraggingItem(null)
                    setDragPreview(null)
                    setDragPosition(null)
                    setIsActuallyDragging(false)
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
              ref={petImageRef}
              className={`absolute transition-all ease-in-out cursor-pointer ${draggingItem ? 'scale-105' : 'scale-100'}`}
              style={{
                left: `${petPosition.x * 100}%`,
                top: `${petPosition.y * 100}%`,
                transform: `translate(-50%, -50%)`,
                zIndex: 50,
                transitionProperty: 'left, top',
                transitionDuration: pet?.mood && pet.mood > 70 ? '1.8s' : '2.5s',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isMoving ? 'walk-bounce 0.4s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={() => setShowPetTooltip(true)}
              onMouseLeave={() => !isPetting && setShowPetTooltip(false)}
              onClick={handlePetPet}
            >
              {/* Spotlight effect on ground - 聚光燈效果 */}
              <div 
                className="absolute left-1/2 top-full transform -translate-x-1/2 pointer-events-none"
                style={{
                  width: '140px',
                  height: '60px',
                  background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.15) 0%, rgba(200, 220, 255, 0.08) 30%, rgba(0, 0, 0, 0) 70%)',
                  filter: 'blur(20px)',
                  marginTop: '10px',
                  zIndex: -1,
                }}
              />
              <div className="relative w-24 h-24 lg:w-32 lg:h-32">
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
                  }}
                />
                {/* Accessories positioned relative to pet */}
                {optimisticAccessories.map((accessory) => {
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
                      className="absolute"
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
                  )
                })}
                {/* Tooltip on hover */}
                {showPetTooltip && !isPetting && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-gray-800/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Pet me
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-gray-800/80"></div>
              </div>
            </div>
          )}
        </div>
      </div>
          )}

          {/* Heart particles effect */}
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
        </div>
      </div>
      </div>
      </div>

      {/* Stickers, Food, and Accessories sidebar - hidden, only accessible via warehouse button */}
      <div className="hidden">
        {/* Sticker palette */}
        <div className="relative flex flex-col w-full min-h-[180px] rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm px-3 py-2 shadow-sm">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2 sticky top-0 bg-white">Decor</h3>
          {availableStickers.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[10px] text-center text-black/40 mb-2">No stickers yet</p>
              <Link href="/shop">
                <button className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-black/20 hover:bg-black/5 transition-colors text-[10px] font-semibold uppercase tracking-wide">
                  <ShoppingCart className="h-3 w-3" />
                  Go to Shop
                </button>
              </Link>
            </div>
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
                  className={`aspect-square rounded-lg border border-black/20 p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
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
            Drag stickers into the room
          </p>
        </div>

        {/* Food palette */}
        <div className="relative flex flex-col w-full min-h-[180px] rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm px-3 py-2 shadow-sm">
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
                    className={`aspect-square rounded-lg border border-black/20 p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
                      food.count === 0 ? 'opacity-40 cursor-not-allowed' : ''
                    } ${draggingItem?.id === food.itemId ? 'opacity-50' : ''}`}
                  >
                    <div className="relative w-full h-full mb-1 flex items-center justify-center">
                      {food.imageUrl ? (
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ maxHeight: '1.5rem', maxWidth: '1.5rem' }}
                        />
                      ) : (
                        <span className="text-lg lg:text-xl">{food.emoji}</span>
                      )}
                    </div>
                    <div className="text-[9px] lg:text-[10px] font-semibold uppercase text-center leading-tight line-clamp-1">{food.name}</div>
                    <div className="text-[9px] lg:text-[10px] text-black/60">x{food.count}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-black/40 mt-2">
                Drag food to pet
              </p>
            </>
          ) : (
            <div className="text-center mt-6">
              <p className="text-[11px] lg:text-[12px] text-black/40 uppercase tracking-wide mb-3">
                No food yet — Go to shop to buy!
              </p>
              <Link href="/shop">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/20 hover:bg-black/5 transition-colors text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide">
                  <ShoppingCart className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Go to Shop
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Accessories palette */}
        <div className="relative flex flex-col w-full min-h-[180px] rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm px-3 py-2 shadow-sm">
          <h3 className="text-xs text-black/60 uppercase tracking-wide mb-2 sticky top-0 bg-white">Accessories</h3>
          {optimisticAvailableAccessories.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1">
                {optimisticAvailableAccessories.map((accessory) => (
                  <div
                    key={accessory.accessoryId}
                    draggable={accessory.count > 0}
                    onDragStart={(e) => handleAccessoryDragStart(e, accessory.accessoryId, accessory.count)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, 'accessory', accessory.accessoryId, accessory.emoji, accessory.count)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`aspect-square rounded-lg border border-black/20 p-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
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
                Drag accessories to pet
              </p>
            </>
          ) : (
            <div className="text-center mt-6">
              <p className="text-[11px] lg:text-[12px] text-black/40 uppercase tracking-wide mb-3">
                No accessories yet — Go to shop to buy!
              </p>
              <Link href="/shop">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/20 hover:bg-black/5 transition-colors text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide">
                  <ShoppingCart className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Go to Shop
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
