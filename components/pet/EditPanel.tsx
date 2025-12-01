'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Sticker, Utensils, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface EditPanelProps {
  isOpen: boolean
  onClose: () => void
  availableStickers: Array<{
    stickerId: string
    name: string
    emoji: string
    count: number
    imageUrl?: string
  }>
  foodItems?: Array<{
    itemId: string
    name: string
    emoji: string
    count: number
  }>
  availableAccessories?: Array<{
    accessoryId: string
    name: string
    emoji: string
    count: number
    imageUrl?: string | null
  }>
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => void
  onDragEnd?: () => void
  onFoodDragStart?: (event: React.DragEvent<HTMLDivElement>, itemId: string, count: number) => void
  onAccessoryDragStart?: (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => void
}

type TabType = 'stickers' | 'food' | 'accessories'

export default function EditPanel({
  isOpen,
  onClose,
  availableStickers,
  foodItems = [],
  availableAccessories = [],
  onDragStart,
  onDragEnd,
  onFoodDragStart,
  onAccessoryDragStart,
}: EditPanelProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabType>('stickers')
  
  // Default drag handlers if not provided
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stickerId: string, count: number) => {
    if (count <= 0) return
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
    if (onDragStart) {
      onDragStart(event, stickerId, count)
    }
  }

  const handleFoodDragStart = (event: React.DragEvent<HTMLDivElement>, itemId: string, count: number) => {
    if (count <= 0) return
    const dragData = { type: 'food', itemId }
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    event.dataTransfer.effectAllowed = 'copy'
    if (onFoodDragStart) {
      onFoodDragStart(event, itemId, count)
    }
  }

  const handleAccessoryDragStart = (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => {
    if (count <= 0) return
    const dragData = { type: 'accessory', accessoryId }
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    event.dataTransfer.effectAllowed = 'copy'
    if (onAccessoryDragStart) {
      onAccessoryDragStart(event, accessoryId, count)
    }
  }
  
  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd()
    }
  }

  // Get total counts for tabs
  const stickersCount = availableStickers.filter(s => s.count > 0).length
  const foodCount = foodItems.filter(f => f.count > 0).length
  const accessoriesCount = availableAccessories.filter(a => a.count > 0).length

  // Determine which tab to show by default
  const getDefaultTab = (): TabType => {
    if (stickersCount > 0) return 'stickers'
    if (foodCount > 0) return 'food'
    if (accessoriesCount > 0) return 'accessories'
    return 'stickers'
  }

  // Set default tab when panel opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(getDefaultTab())
    }
  }, [isOpen, stickersCount, foodCount, accessoriesCount])

  return (
    <>
      {/* Panel - slides in from right */}
      <div className={`fixed top-0 right-0 bottom-20 z-20 bg-white/95 backdrop-blur-md border-l border-black/20 w-full max-w-md flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/20 bg-white/90 backdrop-blur-sm">
          <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-wide">倉庫</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-black/20 hover:bg-black/5 transition-colors"
            aria-label="關閉倉庫"
          >
            <X className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/20 bg-white/50 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('stickers')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
              activeTab === 'stickers'
                ? 'bg-black text-white'
                : 'text-black/60 hover:text-black hover:bg-black/5'
            }`}
          >
            <Sticker className="h-4 w-4" />
            <span>Decor</span>
            {stickersCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'stickers' ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {stickersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
              activeTab === 'food'
                ? 'bg-black text-white'
                : 'text-black/60 hover:text-black hover:bg-black/5'
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>Food</span>
            {foodCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'food' ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {foodCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('accessories')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
              activeTab === 'accessories'
                ? 'bg-black text-white'
                : 'text-black/60 hover:text-black hover:bg-black/5'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Accessories</span>
            {accessoriesCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'accessories' ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {accessoriesCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Decorations Tab */}
          {activeTab === 'stickers' && (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {availableStickers.map((sticker) => (
                  <div
                    key={sticker.stickerId}
                    draggable={sticker.count > 0}
                    onDragStart={(e) => handleDragStart(e, sticker.stickerId, sticker.count)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-lg border border-black/20 p-2 flex flex-col items-center justify-center transition-all ${
                      sticker.count > 0
                        ? 'hover:bg-black/5 hover:scale-105 cursor-grab active:cursor-grabbing bg-white/50 backdrop-blur-sm'
                        : 'opacity-40 cursor-not-allowed bg-white/30'
                    }`}
                  >
                    {sticker.imageUrl && !failedImages.has(sticker.stickerId) ? (
                      <img
                        src={sticker.imageUrl}
                        alt={sticker.name}
                        className="w-full h-full object-contain mb-1"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(sticker.stickerId))
                        }}
                      />
                    ) : (
                      <span className="text-3xl mb-1">{sticker.emoji}</span>
                    )}
                    <div className="text-[8px] font-bold uppercase text-center line-clamp-1">
                      {sticker.name}
                    </div>
                    <div className="text-[10px] font-bold">×{sticker.count}</div>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {availableStickers.length === 0 && (
                <div className="text-center py-12 text-black/60">
                  <p className="text-sm uppercase tracking-wide">倉庫空空的</p>
                  <p className="text-xs mt-2 mb-4">前往商店購買貼紙吧！</p>
                  <Link href="/shop">
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/20 hover:bg-black/5 transition-colors text-xs font-semibold uppercase tracking-wide">
                      <ShoppingCart className="h-4 w-4" />
                      前往商店
                    </button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Food Tab */}
          {activeTab === 'food' && (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {foodItems.map((food) => (
                  <div
                    key={food.itemId}
                    draggable={food.count > 0}
                    onDragStart={(e) => handleFoodDragStart(e, food.itemId, food.count)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-lg border border-black/20 p-2 flex flex-col items-center justify-center transition-all ${
                      food.count > 0
                        ? 'hover:bg-black/5 hover:scale-105 cursor-grab active:cursor-grabbing bg-white/50 backdrop-blur-sm'
                        : 'opacity-40 cursor-not-allowed bg-white/30'
                    }`}
                  >
                    <span className="text-3xl mb-1">{food.emoji}</span>
                    <div className="text-[8px] font-bold uppercase text-center line-clamp-1">
                      {food.name}
                    </div>
                    <div className="text-[10px] font-bold">×{food.count}</div>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {foodItems.length === 0 && (
                <div className="text-center py-12 text-black/60">
                  <p className="text-sm uppercase tracking-wide">尚無食物</p>
                  <p className="text-xs mt-2 mb-4">前往商店購買食物吧！</p>
                  <Link href="/shop">
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/20 hover:bg-black/5 transition-colors text-xs font-semibold uppercase tracking-wide">
                      <ShoppingCart className="h-4 w-4" />
                      前往商店
                    </button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Accessories Tab */}
          {activeTab === 'accessories' && (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {availableAccessories.map((accessory) => (
                  <div
                    key={accessory.accessoryId}
                    draggable={accessory.count > 0}
                    onDragStart={(e) => handleAccessoryDragStart(e, accessory.accessoryId, accessory.count)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-lg border border-black/20 p-2 flex flex-col items-center justify-center transition-all ${
                      accessory.count > 0
                        ? 'hover:bg-black/5 hover:scale-105 cursor-grab active:cursor-grabbing bg-white/50 backdrop-blur-sm'
                        : 'opacity-40 cursor-not-allowed bg-white/30'
                    }`}
                  >
                    {accessory.imageUrl && !failedImages.has(accessory.accessoryId) ? (
                      <img
                        src={accessory.imageUrl}
                        alt={accessory.name}
                        className="w-full h-full object-contain mb-1"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(accessory.accessoryId))
                        }}
                      />
                    ) : (
                      <span className="text-3xl mb-1">{accessory.emoji}</span>
                    )}
                    <div className="text-[8px] font-bold uppercase text-center line-clamp-1">
                      {accessory.name}
                    </div>
                    <div className="text-[10px] font-bold">×{accessory.count}</div>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              {availableAccessories.length === 0 && (
                <div className="text-center py-12 text-black/60">
                  <p className="text-sm uppercase tracking-wide">尚無配件</p>
                  <p className="text-xs mt-2 mb-4">前往商店購買配件吧！</p>
                  <Link href="/shop">
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/20 hover:bg-black/5 transition-colors text-xs font-semibold uppercase tracking-wide">
                      <ShoppingCart className="h-4 w-4" />
                      前往商店
                    </button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/20 bg-white/50 backdrop-blur-sm">
          <p className="text-xs text-center text-black/60 uppercase tracking-wide">
            拖放物品到房間中
          </p>
        </div>
      </div>
    </>
  )
}
