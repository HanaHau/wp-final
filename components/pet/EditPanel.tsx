'use client'

import { useState } from 'react'
import { X, RotateCw, Trash2, Move, ShoppingCart } from 'lucide-react'
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
  onItemSelect: (type: 'sticker', id: string) => void
}

export default function EditPanel({
  isOpen,
  onClose,
  availableStickers,
  onItemSelect,
}: EditPanelProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  return (
    <>
      {/* Panel - slides in from right */}
      <div className={`fixed top-0 right-0 bottom-20 z-20 bg-white border-l-4 border-black w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-white">
          <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-wide">倉庫</h2>
          <button
            onClick={onClose}
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
            aria-label="關閉倉庫"
          >
            <X className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {availableStickers.map((sticker) => (
              <button
                key={sticker.stickerId}
                onClick={() => sticker.count > 0 && onItemSelect('sticker', sticker.stickerId)}
                disabled={sticker.count === 0}
                className={`aspect-square border-2 border-black p-2 flex flex-col items-center justify-center transition-all ${
                  sticker.count > 0
                    ? 'hover:bg-black hover:text-white hover:scale-105 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
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
              </button>
            ))}
          </div>

          {/* Empty state */}
          {availableStickers.length === 0 && (
            <div className="text-center py-12 text-black/60">
              <p className="text-sm uppercase tracking-wide">倉庫空空的</p>
              <p className="text-xs mt-2 mb-4">前往商店購買貼紙吧！</p>
              <Link href="/shop">
                <button className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-xs font-semibold uppercase tracking-wide">
                  <ShoppingCart className="h-4 w-4" />
                  前往商店
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-black bg-gray-50">
          <p className="text-xs text-center text-black/60 uppercase tracking-wide">
            點擊物品以選取並放置到房間中
          </p>
        </div>
      </div>
    </>
  )
}
