import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

export const dynamic = 'force-dynamic'

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

    // Get all food purchases
    const purchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        category: 'food',
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!purchases.length) {
      return NextResponse.json([])
    }

    const totalByFood: Record<string, number> = {}
    for (const purchase of purchases) {
      totalByFood[purchase.itemId] = (totalByFood[purchase.itemId] || 0) + purchase.quantity
    }

    // Separate regular food items and custom stickers
    const regularFoodItemIds = Object.keys(totalByFood).filter(id => !id.startsWith('custom-'))
    const customFoodItemIds = Object.keys(totalByFood).filter(id => id.startsWith('custom-'))
    
    // Get custom sticker details
    const customStickerIds = customFoodItemIds.map(id => id.replace('custom-', ''))
    const customStickers = customStickerIds.length > 0
      ? await prisma.customSticker.findMany({
          where: {
            id: { in: customStickerIds },
            category: 'food',
          },
        })
      : []
    
    const customStickerMap = new Map(customStickers.map(cs => [cs.id, cs]))
    
    const foodItems = [
      // Regular food items
      ...regularFoodItemIds
        .map((itemId) => {
          const total = totalByFood[itemId] || 0
          if (total <= 0) return null

          const meta = SHOP_ITEM_MAP[itemId]
          if (!meta || meta.category !== 'food') return null

          return {
            itemId,
            name: meta.name,
            emoji: meta.emoji,
            count: total,
            imageUrl: null,
          }
        })
        .filter(Boolean),
      // Custom stickers with food category
      ...customFoodItemIds
        .map((itemId) => {
          const total = totalByFood[itemId] || 0
          if (total <= 0) return null

          const customStickerId = itemId.replace('custom-', '')
          const customSticker = customStickerMap.get(customStickerId)
          if (!customSticker) return null

          return {
            itemId,
            name: customSticker.name,
            emoji: '🖼️',
            count: total,
            imageUrl: customSticker.imageUrl,
          }
        })
        .filter(Boolean),
    ]

    return NextResponse.json(foodItems)
  } catch (error) {
    console.error('取得食物庫存失敗:', error)
    return NextResponse.json({ error: '取得食物清單失敗' }, { status: 500 })
  }
}

