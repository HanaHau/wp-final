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
        className="flex flex-col items-center gap-1.5 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 transition-all group shadow-lg"
        aria-label="餵食"
        style={{ borderRadius: '50px' }}
      >
        <UtensilsCrossed className="h-6 w-6 text-white/90 group-hover:text-white" />
        <span className="text-xs font-semibold uppercase tracking-wide text-white/90 group-hover:text-white">Feed</span>
      </button>

      {/* Decor Button - Oval shape */}
      <button
        onClick={onDecorClick}
        className="flex flex-col items-center gap-1.5 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 transition-all group shadow-lg"
        aria-label="裝飾"
        style={{ borderRadius: '50px' }}
      >
        <Sparkles className="h-6 w-6 text-white/90 group-hover:text-white" />
        <span className="text-xs font-semibold uppercase tracking-wide text-white/90 group-hover:text-white">Accessory</span>
      </button>
    </div>
  )
}

