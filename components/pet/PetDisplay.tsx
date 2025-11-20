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
        <div className="text-lg text-gray-500 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full">
          載入寵物資訊中...
        </div>
      </div>
    )
  }

  const getMoodText = (mood: number) => {
    if (mood >= 80) return '😄 今天心情不錯呢！'
    if (mood >= 60) return '🙂 今天心情還不錯！'
    if (mood >= 40) return '😐 今天心情普通'
    if (mood >= 20) return '😔 今天心情不太好'
    return '😢 今天心情很差'
  }

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* 對話框 - 從寵物口中說出 */}
      <div className="relative mb-6">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border-2 border-purple-200 relative">
          <p className="text-lg font-semibold text-purple-700 whitespace-nowrap">
            {getMoodText(pet.mood)}
          </p>
          {/* 對話框尾巴指向寵物 */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[16px] border-transparent border-t-white"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full -z-10">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[18px] border-transparent border-t-purple-200"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 寵物圖片 - 在房間中央 */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-purple-200 shadow-2xl">
        <Image
          src={pet.imageUrl || '/cat.jpg'}
          alt={pet.name}
          fill
          className="object-cover"
        />
      </div>
    </div>
  )
}
