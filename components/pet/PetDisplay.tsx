'use client'

import Image from 'next/image'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
}

interface PetDisplayProps {
  pet: Pet | null
}

export default function PetDisplay({ pet }: PetDisplayProps) {
  if (!pet) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-black/60 border-2 border-black px-6 py-3 uppercase tracking-wide">
          Loading...
        </div>
      </div>
    )
  }

  const getMoodText = (mood: number) => {
    if (mood >= 80) return 'Feeling Great!'
    if (mood >= 60) return 'Feeling Good'
    if (mood >= 40) return 'Feeling Okay'
    if (mood >= 20) return 'Feeling Low'
    return 'Feeling Bad'
  }

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Speech bubble - minimalist */}
      <div className="relative mb-4">
        <div className="bg-white px-4 py-3 border-2 border-black relative">
          <p className="text-sm font-bold text-black uppercase tracking-wide whitespace-nowrap">
            {getMoodText(pet.mood)}
          </p>
          {/* Speech bubble tail */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-transparent border-t-black"></div>
          </div>
        </div>
      </div>

      {/* Pet image */}
      <div className="relative w-48 h-48">
        <Image
          src={pet.imageUrl || '/cat.jpg'}
          alt={pet.name}
          fill
          className="object-contain"
        />
      </div>
    </div>
  )
}
