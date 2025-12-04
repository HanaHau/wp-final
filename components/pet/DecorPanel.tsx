'use client'

import { useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface AvailableAccessory {
  accessoryId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string | null
}

interface DecorPanelProps {
  isOpen: boolean
  onClose: () => void
  availableAccessories: AvailableAccessory[]
  onDragAccessory: (accessoryId: string, event: React.DragEvent) => void
}

export default function DecorPanel({
  isOpen,
  onClose,
  availableAccessories,
  onDragAccessory,
}: DecorPanelProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  return (
    <>
      {/* Panel - slides in from right */}
      <div
        className={`fixed top-0 right-0 bottom-20 z-[60] bg-white/10 backdrop-blur-md border-l border-white/20 w-full max-w-sm flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/5">
          <h2 className="text-xl font-bold uppercase tracking-wide text-white/90">裝飾</h2>
          <button
            onClick={onClose}
            className="p-2 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-colors rounded"
            aria-label="關閉"
          >
            <X className="h-5 w-5 text-white/90" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {availableAccessories.length === 0 ? (
              <div className="col-span-full text-center py-12 text-white/60">
                <p className="text-sm uppercase tracking-wide">沒有配件</p>
                <p className="text-xs mt-2 mb-4">前往商店購買！</p>
                <Link href="/shop">
                  <button className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-colors text-xs font-semibold uppercase tracking-wide rounded">
                    <ShoppingCart className="h-4 w-4" />
                    前往商店
                  </button>
                </Link>
              </div>
            ) : (
              availableAccessories.map((accessory) => (
                <div
                  key={accessory.accessoryId}
                  draggable={accessory.count > 0}
                  onDragStart={(e) => {
                    if (accessory.count > 0) {
                      onDragAccessory(accessory.accessoryId, e)
                      // Create custom drag image showing only the accessory
                      const dragImage = document.createElement('div')
                      dragImage.style.position = 'absolute'
                      dragImage.style.top = '-1000px'
                      dragImage.style.left = '-1000px'
                      if (accessory.imageUrl && !failedImages.has(accessory.accessoryId)) {
                        dragImage.innerHTML = `<img src="${accessory.imageUrl}" style="width: 64px; height: 64px; object-contain;" />`
                      } else {
                        dragImage.innerHTML = `<span style="font-size: 48px;">${accessory.emoji}</span>`
                      }
                      document.body.appendChild(dragImage)
                      e.dataTransfer.setDragImage(dragImage, 32, 32)
                      setTimeout(() => {
                        if (document.body.contains(dragImage)) {
                          document.body.removeChild(dragImage)
                        }
                      }, 0)
                    } else {
                      e.preventDefault()
                    }
                  }}
                  onDragEnd={(e) => {
                    // Clean up any remaining drag images
                    const dragImages = document.querySelectorAll('[style*="position: absolute"][style*="top: -1000px"]')
                    dragImages.forEach(img => {
                      if (document.body.contains(img)) {
                        document.body.removeChild(img)
                      }
                    })
                  }}
                  className={`aspect-square border border-white/20 p-3 flex flex-col items-center justify-center transition-all rounded ${
                    accessory.count > 0
                      ? 'hover:bg-white/20 hover:border-white/30 hover:scale-105 cursor-grab active:cursor-grabbing'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{
                    userSelect: 'none',
                    WebkitUserDrag: accessory.count > 0 ? 'element' : 'none',
                  } as React.CSSProperties & { WebkitUserDrag?: string }}
                >
                  {/* Accessory icon/emoji */}
                  <div className="flex-shrink-0 mb-2 pointer-events-none select-none">
                    {accessory.imageUrl && !failedImages.has(accessory.accessoryId) ? (
                      <img
                        src={accessory.imageUrl}
                        alt={accessory.name}
                        className="w-16 h-16 object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(accessory.accessoryId))
                        }}
                        draggable={false}
                      />
                    ) : (
                      <span className="text-4xl block select-none">{accessory.emoji}</span>
                    )}
                  </div>
                  {/* Text labels */}
                  <div className="text-[10px] font-bold uppercase text-center line-clamp-1 mb-1 pointer-events-none select-none text-white/90">
                    {accessory.name}
                  </div>
                  <div className="text-xs font-bold pointer-events-none select-none text-white/90">×{accessory.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/20 bg-white/5">
          <p className="text-xs text-center text-white/60 uppercase tracking-wide">
            拖曳配件到寵物身上來裝備
          </p>
        </div>
      </div>
    </>
  )
}
