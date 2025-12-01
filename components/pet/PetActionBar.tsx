'use client'

import { UtensilsCrossed, Sparkles } from 'lucide-react'

interface PetActionBarProps {
  onFeedClick: () => void
  onDecorClick: () => void
}

export default function PetActionBar({ onFeedClick, onDecorClick }: PetActionBarProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Feed Button - Oval shape */}
      <button
        onClick={onFeedClick}
        className="flex flex-col items-center gap-1.5 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full hover:bg-gray-100 hover:border-gray-400 transition-all group shadow-sm"
        aria-label="餵食"
        style={{ borderRadius: '50px' }}
      >
        <UtensilsCrossed className="h-6 w-6 text-gray-700 group-hover:text-gray-900" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 group-hover:text-gray-900">Feed</span>
      </button>

      {/* Decor Button - Oval shape */}
      <button
        onClick={onDecorClick}
        className="flex flex-col items-center gap-1.5 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full hover:bg-gray-100 hover:border-gray-400 transition-all group shadow-sm"
        aria-label="裝飾"
        style={{ borderRadius: '50px' }}
      >
        <Sparkles className="h-6 w-6 text-gray-700 group-hover:text-gray-900" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 group-hover:text-gray-900">Accessory</span>
      </button>
    </div>
  )
}

