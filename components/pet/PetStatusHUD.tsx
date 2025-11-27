'use client'

import { Heart, UtensilsCrossed, Activity } from 'lucide-react'

interface PetStatusHUDProps {
  mood: number
  fullness: number
  health: number
}

export default function PetStatusHUD({ mood, fullness, health }: PetStatusHUDProps) {
  const moodValue = Math.min(mood || 0, 100)
  const fullnessValue = Math.min(fullness || 0, 100)
  const healthValue = Math.min(health || 0, 100)

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-300 shadow-sm">
      {/* Mood */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-gray-700 fill-gray-700" />
          <span className="text-xs font-semibold text-gray-700">MOOD: {moodValue}</span>
        </div>
        <div className="w-20 h-1.5 bg-gray-200/80 border border-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-600 transition-all duration-300"
            style={{ width: `${moodValue}%` }}
          />
        </div>
      </div>

      {/* Fullness */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-gray-700" />
          <span className="text-xs font-semibold text-gray-700">FULL: {fullnessValue}</span>
        </div>
        <div className="w-20 h-1.5 bg-gray-200/80 border border-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-600 transition-all duration-300"
            style={{ width: `${fullnessValue}%` }}
          />
        </div>
      </div>

      {/* Health */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-gray-700" />
          <span className="text-xs font-semibold text-gray-700">HEALTH: {healthValue}</span>
        </div>
        <div className="w-20 h-1.5 bg-gray-200/80 border border-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-600 transition-all duration-300"
            style={{ width: `${healthValue}%` }}
          />
        </div>
      </div>
    </div>
  )
}

