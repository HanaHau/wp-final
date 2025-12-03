'use client'

import { Heart, UtensilsCrossed } from 'lucide-react'

interface PetStatusHUDProps {
  mood: number
  fullness: number
}

export default function PetStatusHUD({ mood, fullness }: PetStatusHUDProps) {
  const moodValue = Math.min(mood || 0, 100)
  const fullnessValue = Math.min(fullness || 0, 100)

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
      {/* Mood */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-white/90 fill-white/90" />
          <span className="text-xs font-semibold text-white/90">MOOD: {moodValue}</span>
        </div>
        <div className="w-20 h-1.5 bg-white/20 border border-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all duration-300"
            style={{ width: `${moodValue}%` }}
          />
        </div>
      </div>

      {/* Fullness */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-white/90" />
          <span className="text-xs font-semibold text-white/90">FULL: {fullnessValue}</span>
        </div>
        <div className="w-20 h-1.5 bg-white/20 border border-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all duration-300"
            style={{ width: `${fullnessValue}%` }}
          />
        </div>
      </div>

    </div>
  )
}

