'use client'

import { useState } from 'react'
import { X, ShoppingCart, Sticker } from 'lucide-react'
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

type TabType = 'stickers'

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
    if (count <= 0) {
      event.preventDefault()
      return
    }
    
    // 找到對應的貼紙
    const sticker = availableStickers.find(s => s.stickerId === stickerId)
    
    // 創建自定義拖曳圖像，類似 DecorPanel 的方式
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.left = '-1000px'
    dragImage.style.width = '64px'
    dragImage.style.height = '64px'
    dragImage.style.display = 'flex'
    dragImage.style.alignItems = 'center'
    dragImage.style.justifyContent = 'center'
    
    if (sticker?.imageUrl && !failedImages.has(stickerId)) {
      dragImage.innerHTML = `<img src="${sticker.imageUrl}" style="width: 64px; height: 64px; object-contain;" />`
    } else {
      const emoji = sticker?.emoji || '⬛'
      dragImage.innerHTML = `<span style="font-size: 48px;">${emoji}</span>`
    }
    
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 32, 32)
    
    // 設置拖曳數據 - Chrome 需要明確設置這些
    event.dataTransfer.setData('application/json', JSON.stringify({ stickerId }))
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.dropEffect = 'copy'
    
    // 清理臨時元素
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage)
      }
    }, 0)
    
    // Chrome 需要明確阻止默認行為
    event.stopPropagation()
    
    if (onDragStart) {
      onDragStart(event, stickerId, count)
    }
  }

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd()
    }
  }

  // Get total counts for tabs
  const stickersCount = availableStickers.filter(s => s.count > 0).length

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

        {/* Header with count */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/20 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sticker className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wide">Decor</span>
            {stickersCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/10">
                {stickersCount}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
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
                    draggable={false}
                  />
                ) : (
                  <span className="text-3xl mb-1" draggable={false}>{sticker.emoji}</span>
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
