'use client'

import { useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface FoodItem {
  itemId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string | null // For custom stickers
}

interface FeedPanelProps {
  isOpen: boolean
  onClose: () => void
  foodItems: FoodItem[]
  onFeedPet: (itemId: string) => void
}

export default function FeedPanel({
  isOpen,
  onClose,
  foodItems,
  onFeedPet,
}: FeedPanelProps) {
  return (
    <>
      {/* Panel - slides in from left */}
      <div
        data-feed-panel
        className={`fixed top-0 left-0 bottom-20 z-[60] bg-white border-r-4 border-black w-full max-w-sm flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-white">
          <h2 className="text-xl font-bold uppercase tracking-wide">餵食</h2>
          <button
            onClick={onClose}
            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {foodItems.length === 0 ? (
            <div className="text-center py-12 text-black/60">
              <p className="text-sm uppercase tracking-wide mb-2">沒有食物</p>
              <p className="text-xs mb-4">前往商店購買！</p>
              <Link href="/shop">
                <button className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-xs font-semibold uppercase tracking-wide">
                  <ShoppingCart className="h-4 w-4" />
                  前往商店
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {foodItems.map((food) => (
                <button
                  key={food.itemId}
                  onClick={() => {
                    if (food.count > 0) {
                      onFeedPet(food.itemId)
                    }
                  }}
                  disabled={food.count === 0}
                  className={`aspect-square border-2 border-black p-3 flex flex-col items-center justify-center transition-all ${
                    food.count > 0
                      ? 'hover:bg-black hover:text-white hover:scale-105 cursor-pointer active:scale-95'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  {food.imageUrl ? (
                    <div className="relative w-full mb-2 flex items-center justify-center" style={{ height: '3rem' }}>
                      <img
                        src={food.imageUrl}
                        alt={food.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ maxHeight: '3rem', maxWidth: '3rem' }}
                      />
                    </div>
                  ) : (
                    <span className="text-4xl mb-2">{food.emoji}</span>
                  )}
                  <div className="text-[10px] font-bold uppercase text-center line-clamp-1 mb-1">
                    {food.name}
                  </div>
                  <div className="text-xs font-bold">×{food.count}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-black bg-gray-50">
          <p className="text-xs text-center text-black/60 uppercase tracking-wide">
            點擊食物來餵食你的寵物
          </p>
        </div>
      </div>
    </>
  )
}

