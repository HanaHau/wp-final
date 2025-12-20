'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { ShoppingBag, Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { SHOP_ITEMS, ShopItem, ShopItemCategory } from '@/data/shop-items'
import CustomStickerDialog from './CustomStickerDialog'
import { useToast } from '@/components/ui/use-toast'

interface Pet {
  id: string
  points: number
}

export default function ShopContent() {
  const { data: session } = useSession()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isCustomStickerDialogOpen, setIsCustomStickerDialogOpen] = useState(false)
  const [customStickers, setCustomStickers] = useState<Array<{ id: string; name: string; imageUrl: string; category: ShopItemCategory; price: number; userId?: string }>>([])
  const [publicStickers, setPublicStickers] = useState<Array<{ id: string; name: string; imageUrl: string; category: ShopItemCategory; price: number; userId: string; user: { name: string | null; email: string } }>>([])
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchShopData()
  }, [])

  // 合併所有 shop 資料請求為單一 API 調用
  const fetchShopData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/shop-data', {
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch shop data')
      }
      
      const data = await res.json()
      
      // 設置所有狀態
      setPet(data.pet)
      setCustomStickers(data.customStickers || [])
      setPublicStickers(data.publicStickers || [])
    } catch (error) {
      console.error('Failed to fetch shop data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getQuantity = (itemId: string) => quantities[itemId] ?? 0

  const adjustQuantity = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] ?? 0
      const next = Math.min(99, Math.max(0, current + delta))
      if (next === current) return prev
      return {
        ...prev,
        [itemId]: next,
      }
    })
  }

  const handlePurchase = async (item: ShopItem) => {
    const quantity = getQuantity(item.id)
    if (quantity <= 0) {
      toast({
        title: 'Please Select Quantity',
        description: 'Please select a quantity.',
        variant: 'destructive',
      })
      return
    }

    const totalCost = item.cost * quantity
    if (!pet || pet.points < totalCost) {
      toast({
        title: 'Insufficient Points',
        description: 'Not enough points!',
        variant: 'destructive',
      })
      return
    }

    setPurchasing(item.id)
    try {
      const res = await fetch('/api/pet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          quantity,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Purchase failed')
      }

      await fetchShopData()
      setQuantities((prev) => ({
        ...prev,
        [item.id]: 0,
      }))
      toast({
        title: 'Purchase Successful',
        description: `Purchased ${item.name}!`,
      })
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Purchase failed',
        variant: 'destructive',
      })
    } finally {
      setPurchasing(null)
    }
  }

  // Convert custom stickers to shop items format
  // First, convert own stickers (priority)
  const ownCustomShopItems: ShopItem[] = customStickers.map((cs) => ({
    id: `custom-${cs.id}`,
    name: cs.name,
    emoji: '🖼️',
    cost: cs.price || 100, // 使用貼紙設定的價格
    description: 'Custom sticker',
    category: cs.category,
    imageUrl: cs.imageUrl,
    isOwn: true,
  }))

  // Then, convert public stickers (excluding own stickers to avoid duplicates)
  const ownStickerIds = new Set(customStickers.map((cs) => cs.id))
  const publicCustomShopItems: ShopItem[] = publicStickers
    .filter((ps) => !ownStickerIds.has(ps.id)) // Exclude own stickers
    .map((ps) => ({
      id: `custom-${ps.id}`,
      name: ps.name,
      emoji: '🖼️',
      cost: ps.price || 100, // 使用貼紙設定的價格
      description: 'Custom sticker',
      category: ps.category,
      imageUrl: ps.imageUrl,
      isOwn: false,
      isPublic: true,
      creatorName: ps.user.name || ps.user.email.split('@')[0],
    }))

  // Priority: own stickers first, then public stickers, then regular shop items
  const allItems = [...ownCustomShopItems, ...publicCustomShopItems, ...SHOP_ITEMS]
  
  const filteredItems = selectedCategory === 'all'
    ? allItems
    : allItems.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Shop</h1>
        </div>

        {/* Points Display */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/60">Available Points</p>
                <p className="text-3xl font-bold text-black">{pet?.points || 0}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-black" />
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'food', 'decoration', 'accessory'].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className="rounded-xl whitespace-nowrap"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>

        {/* Shop Items Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Make Your Own Sticker - centered in the grid */}
          {selectedCategory === 'all' && (
            <Card className="col-span-3 flex items-center justify-center">
              <CardContent className="p-4" style={{ width: 'min(460px, 100%)' }}>
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2 flex items-center justify-center">
                    <Plus className="h-12 w-12" />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Make Your Own Sticker</h3>
                  <p className="text-xs text-black/60 mt-1">Upload your custom sticker</p>
                </div>
                <Button
                  onClick={() => setIsCustomStickerDialogOpen(true)}
                  className="w-full rounded-xl"
                >
                  Create Sticker
                </Button>
              </CardContent>
            </Card>
          )}
          {filteredItems.map((item) => (
            <Card key={item.id} className="relative">
              {/* Public sticker badge */}
              {item.isPublic && !item.isOwn && (
                <div className="absolute top-2 right-2 bg-black text-white text-[8px] uppercase tracking-wide px-1.5 py-0.5 border border-white">
                  By {item.creatorName}
                </div>
              )}
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  {item.imageUrl && !failedImages.has(item.id) ? (
                    <div className="relative w-full mb-2 flex items-center justify-center" style={{ height: '3rem' }}>
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="max-w-full max-h-full object-contain"
                        style={{ maxHeight: '3rem', maxWidth: '3rem' }}
                        unoptimized
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(item.id))
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-5xl mb-2" style={{ height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.emoji}</div>
                  )}
                  <h3 className="font-bold text-sm uppercase tracking-wide">{item.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1 justify-center">
                    <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 bg-black/10 border border-black/20 rounded">
                      {item.category}
                    </span>
                    {item.category === 'food' && item.fullnessRecovery && (
                      <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 bg-green-100 border border-green-300 rounded">
                        Fullness +{item.fullnessRecovery}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-black/60">Cost</span>
                  <span className="font-bold text-lg">{item.cost} pts</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-black/60">Quantity</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg border border-black/20 h-7 w-7"
                      onClick={() => adjustQuantity(item.id, -1)}
                      disabled={getQuantity(item.id) === 0}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center font-semibold text-sm">
                      {getQuantity(item.id)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-lg border border-black/20 h-7 w-7"
                      onClick={() => adjustQuantity(item.id, 1)}
                      disabled={getQuantity(item.id) >= 99}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-black/60">Total</span>
                  <span className="font-bold">
                    {item.cost * getQuantity(item.id)} pts
                  </span>
                </div>
                <Button
                  onClick={() => handlePurchase(item)}
                  disabled={
                    !pet ||
                    getQuantity(item.id) === 0 ||
                    pet.points < item.cost * getQuantity(item.id) ||
                    purchasing === item.id
                  }
                  className="w-full"
                >
                  {purchasing === item.id
                    ? 'Buying...'
                    : getQuantity(item.id) === 0
                      ? 'Select Qty'
                      : pet && pet.points >= item.cost * getQuantity(item.id)
                        ? `Buy (${item.cost * getQuantity(item.id)} pts)`
                        : 'Not Enough'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <Navigation />

      {/* Custom Sticker Dialog */}
      <CustomStickerDialog
        open={isCustomStickerDialogOpen}
        onOpenChange={setIsCustomStickerDialogOpen}
        petPoints={pet?.points || 0}
        onSuccess={() => {
          fetchShopData()
        }}
      />
    </div>
  )
}

