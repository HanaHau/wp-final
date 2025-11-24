import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP, DECOR_SHOP_CATEGORIES } from '@/data/shop-items'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    if (!pet) {
      return NextResponse.json([])
    }

    const purchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        category: { in: DECOR_SHOP_CATEGORIES },
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!purchases.length) {
      return NextResponse.json([])
    }

    const totalBySticker: Record<string, number> = {}
    for (const purchase of purchases) {
      totalBySticker[purchase.itemId] = (totalBySticker[purchase.itemId] || 0) + purchase.quantity
    }

    const stickerIds = Object.keys(totalBySticker)

    const placedCountsRaw = stickerIds.length
      ? await prisma.roomSticker.groupBy({
          by: ['stickerId'],
          _count: true,
          where: {
            petId: pet.id,
            stickerId: { in: stickerIds },
          },
        })
      : []

    const placedCounts: Record<string, number> = {}
    for (const item of placedCountsRaw) {
      placedCounts[item.stickerId] = item._count
    }

    const available = stickerIds
      .filter((stickerId) => !stickerId.startsWith('custom-')) // Exclude custom stickers, they're handled separately
      .map((stickerId) => {
        const total = totalBySticker[stickerId] || 0
        const placed = placedCounts[stickerId] || 0
        const remaining = total - placed
        if (remaining <= 0) return null

        const meta = SHOP_ITEM_MAP[stickerId]
        return {
          stickerId,
          name: meta?.name ?? 'Sticker',
          emoji: meta?.emoji ?? '⬛',
          count: remaining,
        }
      })
      .filter(Boolean)

    // Get all custom sticker purchases (including purchased public stickers)
    const customPurchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        itemId: { startsWith: 'custom-' },
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!customPurchases.length) {
      return NextResponse.json([...available])
    }

    const customStickerIds = customPurchases.map((p) => p.itemId.replace('custom-', ''))
    
    // Get custom sticker details for purchased stickers
    const customStickers = await prisma.customSticker.findMany({
      where: {
        id: { in: customStickerIds },
        category: { in: ['toy', 'decoration'] }, // Only Toy and Decoration categories
      },
    })

    // Create a map of custom sticker ID to custom sticker data
    const customStickerMap = new Map(customStickers.map((cs) => [cs.id, cs]))

    const customTotalBySticker: Record<string, number> = {}
    for (const purchase of customPurchases) {
      customTotalBySticker[purchase.itemId] = (customTotalBySticker[purchase.itemId] || 0) + purchase.quantity
    }

    const customStickerItemIds = customPurchases.map((p) => p.itemId)
    const customPlacedCountsRaw = customStickerItemIds.length
      ? await prisma.roomSticker.groupBy({
          by: ['stickerId'],
          _count: true,
          where: {
            petId: pet.id,
            stickerId: { in: customStickerItemIds },
          },
        })
      : []

    const customPlacedCounts: Record<string, number> = {}
    for (const item of customPlacedCountsRaw) {
      customPlacedCounts[item.stickerId] = item._count
    }

    // Process custom stickers, deduplicate by stickerId
    const processedStickerIds = new Set<string>()
    const customAvailable: Array<{ stickerId: string; name: string; emoji: string; imageUrl: string; count: number }> = []
    
    for (const purchase of customPurchases) {
      const stickerId = purchase.itemId
      
      // Skip if already processed
      if (processedStickerIds.has(stickerId)) continue
      processedStickerIds.add(stickerId)
      
      const customStickerId = stickerId.replace('custom-', '')
      const customSticker = customStickerMap.get(customStickerId)
      
      // Skip if sticker not found or not in Toy/Decoration category
      if (!customSticker) continue
      
      const total = customTotalBySticker[stickerId] || 0
      const placed = customPlacedCounts[stickerId] || 0
      const remaining = total - placed
      if (remaining <= 0) continue

      customAvailable.push({
        stickerId,
        name: customSticker.name,
        emoji: '🖼️',
        imageUrl: customSticker.imageUrl,
        count: remaining,
      })
    }

    return NextResponse.json([...available, ...customAvailable])
  } catch (error) {
    console.error('取得可用貼紙失敗:', error)
    return NextResponse.json({ error: '取得貼紙清單失敗' }, { status: 500 })
  }
}

