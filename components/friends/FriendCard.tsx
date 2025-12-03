'use client'

import { Button } from '@/components/ui/button'
import { Heart, Utensils, Home, AlertCircle, Droplet, Smile, Frown, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

interface Friend {
  id: string
  email: string
  userID: string | null
  name: string | null
  image: string | null
  friendshipId: string
}

interface PetAccessory {
  id: string
  accessoryId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  imageUrl?: string | null
}

interface FriendPetData {
  pet: {
    id: string
    name: string
    imageUrl: string | null
    mood: number
    fullness: number
    isUnhappy?: boolean
    isHungry?: boolean
    needsAttention?: boolean
    isSick?: boolean
    accessories?: PetAccessory[]
  }
  user: {
    id: string
    email: string
    userID: string | null
    name: string | null
  }
}

interface FriendCardProps {
  friend: Friend
  onUpdate: (friendId: string, updates: { mood?: number; fullness?: number }) => void
  onVisitRoom: () => void
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
}

// Skeleton loader component
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/20 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-black/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
      <div className="relative h-40 bg-white flex items-center justify-center">
        <div className="w-36 h-36 bg-gray-200 rounded-full" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
      <div className="p-4">
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// Status badge component
function StatusBadge({ 
  icon: Icon, 
  label, 
  variant = 'default' 
}: { 
  icon: any
  label: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const variantStyles = {
    default: 'bg-black/10 text-black/80 border-black/20',
    warning: 'bg-black/10 text-black/80 border-black/20',
    danger: 'bg-black/20 text-black border-black/30',
    success: 'bg-black/5 text-black/60 border-black/10',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${variantStyles[variant]}`}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  )
}

export default function FriendCard({ friend, onUpdate, onVisitRoom }: FriendCardProps) {

  // Use SWR for data fetching with auto-refresh every 30 seconds
  const { data: petData, error, isLoading, mutate } = useSWR<FriendPetData>(
    `/api/friends/${friend.id}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Determine pet animation state based on status
  const getPetState = () => {
    if (!petData?.pet) return 'idle'
    if (petData.pet.isSick) return 'sleeping'
    if (petData.pet.isHungry) return 'idle'
    if (petData.pet.mood > 70) return 'happy'
    return 'idle'
  }

  // Get status badges
  const getStatusBadges = () => {
    if (!petData?.pet) return []
    const badges = []
    
    if (petData.pet.isSick) {
      badges.push({ icon: AlertCircle, label: '生病中', variant: 'danger' as const })
    } else if (petData.pet.isHungry) {
      badges.push({ icon: Utensils, label: '肚子餓了', variant: 'warning' as const })
    } else if (petData.pet.isUnhappy) {
      badges.push({ icon: Frown, label: '心情不好', variant: 'warning' as const })
    } else if (petData.pet.mood > 70 && petData.pet.fullness > 70) {
      badges.push({ icon: Smile, label: '心情很好', variant: 'success' as const })
    }
    
    if (petData.pet.needsAttention && !petData.pet.isSick) {
      badges.push({ icon: Zap, label: '需要關心', variant: 'warning' as const })
    }

    return badges
  }


  if (isLoading) {
    return <CardSkeleton />
  }

  if (error || !petData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-black/20 overflow-hidden p-6 text-center">
        <p className="text-black/60 text-sm">載入失敗</p>
      </div>
    )
  }

  const statusBadges = getStatusBadges()
  const petState = getPetState()

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/20 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
      {/* Header - Friend Info */}
      <div className="p-4 border-b border-black/20 bg-gradient-to-r from-white to-gray-50/50 mb-2">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 bg-black text-white flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ring-2 ring-white shadow-md">
            {friend.name?.charAt(0) || friend.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-black truncate text-base">
              {friend.name || friend.userID || friend.email}
            </div>
            <div className="text-xs text-black/60 truncate">
              {friend.userID ? `@${friend.userID}` : friend.email}
            </div>
          </div>
        </div>
      </div>

      {/* Pet Preview Area - Core Visual */}
      <div className="relative h-40 bg-white overflow-hidden flex items-center justify-center">
        {/* Pet Image with Animation */}
        <div className="relative w-36 h-36">
          <div 
            className={`relative w-full h-full ${
              petState === 'sleeping' ? 'opacity-70 scale-95' : ''
            }`}
          >
            <Image
              src={petData.pet.imageUrl || '/cat.png'}
              alt={petData.pet.name}
              fill
              className="object-contain"
              sizes="144px"
              priority={false}
              style={{ 
                WebkitUserSelect: 'none', 
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              draggable={false}
            />
            {/* Accessories positioned relative to pet */}
            {petData.pet.accessories && petData.pet.accessories.map((accessory) => (
              <div
                key={accessory.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${accessory.positionX * 100}%`,
                  top: `${accessory.positionY * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${accessory.rotation}deg) scale(${accessory.scale})`,
                  zIndex: 10,
                }}
              >
                {accessory.imageUrl ? (
                  <img
                    src={accessory.imageUrl}
                    alt="Accessory"
                    className="max-w-[24px] max-h-[24px] object-contain"
                  />
                ) : (
                  <span className="text-xl">
                    {(() => {
                      const shopItem = SHOP_ITEM_MAP[accessory.accessoryId]
                      return shopItem?.emoji || '🎀'
                    })()}
                  </span>
                )}
              </div>
            ))}
            {/* Status indicator overlay */}
            {petData.pet.isSick && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center animate-pulse z-20">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            )}
            {petData.pet.isHungry && !petData.pet.isSick && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-black/80 rounded-full flex items-center justify-center animate-pulse z-20">
                <Utensils className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Status Badges - 左上角 */}
        {statusBadges.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
            {statusBadges.map((badge, idx) => (
              <StatusBadge key={idx} {...badge} />
            ))}
          </div>
        )}
      </div>

      {/* Pet Name - 寵物圖片正下方，進度條正上方 */}
      <div className="px-4 pt-2 pb-2 bg-white">
        <div className="text-xl font-bold text-black text-center">
          {petData.pet.name}
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 pt-2 space-y-3 border-b border-black/20 bg-white">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-black" />
              <span className="text-xs font-semibold text-black/70 uppercase tracking-wide">心情</span>
            </div>
            <span className="text-xs font-bold text-black">{petData.pet.mood}/100</span>
          </div>
          <div
            className="relative w-full h-4 rounded-lg border border-black/20 overflow-hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 6px, transparent 6px 12px)',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
              style={{
                width: `${petData.pet.mood}%`,
                backgroundColor: petData.pet.mood < 30 ? '#c0392b' : petData.pet.mood < 50 ? '#f39c12' : '#0f172a',
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="h-3.5 w-3.5 text-black" />
              <span className="text-xs font-semibold text-black/70 uppercase tracking-wide">飽足感</span>
            </div>
            <span className="text-xs font-bold text-black">{petData.pet.fullness}/100</span>
          </div>
          <div
            className="relative w-full h-4 rounded-lg border border-black/20 overflow-hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 6px, transparent 6px 12px)',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 h-full transition-[width] duration-500"
              style={{
                width: `${petData.pet.fullness}%`,
                backgroundColor: petData.pet.fullness < 30 ? '#c0392b' : petData.pet.fullness < 50 ? '#f39c12' : '#0f172a',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-50/50">
        <Link 
          href={`/friends/${friend.id}`}
          prefetch={true}
          className="block"
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              onVisitRoom()
            }}
            className="w-full bg-black text-white hover:bg-black/80 transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            去拜訪 {petData.pet.name}
          </Button>
        </Link>
      </div>
    </div>
  )
}
