'use client'

import Image from 'next/image'

interface RoomSticker {
  id: string
  stickerId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  layer: 'floor' | 'wall-left' | 'wall-right'
}

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
}

interface RoomProps {
  pet: Pet | null
  stickers?: RoomSticker[]
}

export default function Room({ pet, stickers = [] }: RoomProps) {
  // Sticker definitions - minimalist black/white stickers
  const stickerTypes: Record<string, { emoji: string; name: string }> = {
    'rug': { emoji: '⬜', name: 'Rug' },
    'desk': { emoji: '⬛', name: 'Desk' },
    'monitor': { emoji: '⬛', name: 'Monitor' },
    'poster': { emoji: '⬛', name: 'Poster' },
    'cup': { emoji: '⬛', name: 'Cup' },
    'speaker': { emoji: '⬛', name: 'Speaker' },
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center py-8 min-h-[400px]">
      {/* One-Point Perspective Room - Simple: square + 4 perspective lines */}
      <div className="relative" style={{ width: '600px', height: '450px' }}>
        <svg
          width="600"
          height="450"
          viewBox="0 0 800 600"
          className="w-full h-full"
        >
          {/* Outer rectangle (room boundaries) - visible border */}
          <rect
            x="50"
            y="50"
            width="700"
            height="500"
            fill="none"
            stroke="black"
            strokeWidth="4"
          />

          {/* Back wall - center square (bigger) */}
          <rect
            x="250"
            y="150"
            width="300"
            height="300"
            fill="white"
            stroke="black"
            strokeWidth="4"
          />

          {/* 4 perspective lines connecting corners of square to corners of rectangle */}
          {/* Top-left corner */}
          <line
            x1="50"
            y1="50"
            x2="250"
            y2="150"
            stroke="black"
            strokeWidth="4"
          />
          {/* Top-right corner */}
          <line
            x1="750"
            y1="50"
            x2="550"
            y2="150"
            stroke="black"
            strokeWidth="4"
          />
          {/* Bottom-left corner */}
          <line
            x1="50"
            y1="550"
            x2="250"
            y2="450"
            stroke="black"
            strokeWidth="4"
          />
          {/* Bottom-right corner */}
          <line
            x1="750"
            y1="550"
            x2="550"
            y2="450"
            stroke="black"
            strokeWidth="4"
          />
        </svg>

        {/* Floor area for stickers and pet - positioned in center of floor */}
        <div 
          className="absolute"
          style={{
            left: '50%',
            top: '70%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '200px',
          }}
        >
          {/* Floor stickers */}
          {stickers
            .filter((s) => s.layer === 'floor')
            .map((sticker) => (
              <div
                key={sticker.id}
                className="absolute"
                style={{
                  left: `${sticker.positionX * 100}%`,
                  top: `${sticker.positionY * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                  zIndex: 1,
                }}
              >
                <div className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center text-xl">
                  {stickerTypes[sticker.stickerId]?.emoji || '⬛'}
                </div>
              </div>
            ))}
          
          {/* Pet on floor */}
          {pet && (
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}
            >
              <div className="relative w-32 h-32">
                <Image
                  src={pet.imageUrl || '/cat.jpg'}
                  alt={pet.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Left wall area for stickers */}
        <div 
          className="absolute"
          style={{
            left: '12.5%',
            top: '33%',
            width: '250px',
            height: '200px',
            clipPath: 'polygon(0 0, 100% 25%, 100% 75%, 0 100%)',
          }}
        >
          {stickers
            .filter((s) => s.layer === 'wall-left')
            .map((sticker) => (
              <div
                key={sticker.id}
                className="absolute"
                style={{
                  left: `${sticker.positionX * 100}%`,
                  top: `${sticker.positionY * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                }}
              >
                <div className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center text-xl">
                  {stickerTypes[sticker.stickerId]?.emoji || '⬛'}
                </div>
              </div>
            ))}
        </div>

        {/* Right wall area for stickers */}
        <div 
          className="absolute"
          style={{
            right: '12.5%',
            top: '33%',
            width: '250px',
            height: '200px',
            clipPath: 'polygon(0 25%, 100% 0, 100% 100%, 0 75%)',
          }}
        >
          {stickers
            .filter((s) => s.layer === 'wall-right')
            .map((sticker) => (
              <div
                key={sticker.id}
                className="absolute"
                style={{
                  left: `${sticker.positionX * 100}%`,
                  top: `${sticker.positionY * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                }}
              >
                <div className="border-2 border-black bg-white p-2 w-12 h-12 flex items-center justify-center text-xl">
                  {stickerTypes[sticker.stickerId]?.emoji || '⬛'}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

