import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

export const dynamic = 'force-dynamic'

// Helper function to get emoji for item
const getItemEmoji = (itemId: string): string => {
  const shopItem = SHOP_ITEM_MAP[itemId]
  if (shopItem) {
    return shopItem.emoji
  }
  const fallbackEmojiMap: Record<string, string> = {
    water: '💧',
    cat: '🐱',
  }
  return fallbackEmojiMap[itemId] || '⬛'
}

// GET /api/pet-room-data - 合併所有 pet room 需要的資料（不修改 schema）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 先獲取 pet，用於後續查詢
    let pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
      select: { id: true },
    })

    if (!pet) {
      const now = new Date()
      pet = await prisma.pet.create({
        data: {
          userId: userRecord.id,
          name: 'My Pet',
          points: 50,
          fullness: 70,
          mood: 70,
          lastLoginDate: now,
          lastDailyReset: now,
          consecutiveLoginDays: 0,
        },
        select: { id: true },
      })
    }

    // 並行執行所有查詢以提高性能
    const [
      petData,
      customStickers,
      publicStickers,
      stickers,
      stickerInventory,
      foodInventory,
      accessories,
      accessoryInventory,
    ] = await Promise.all([
      // 1. 獲取寵物資訊（包含 purchases）
      (async () => {
        let petData = await prisma.pet.findUnique({
          where: { id: pet.id },
          include: {
            purchases: {
              orderBy: { purchasedAt: 'desc' },
              take: 10,
            },
          },
        })

        if (!petData) {
          throw new Error('Pet not found')
        }

        // 每日重置邏輯
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const lastReset = petData.lastDailyReset ? new Date(petData.lastDailyReset) : null
        const needsDailyReset = !lastReset || lastReset < today
        const lastLogin = petData.lastLoginDate ? new Date(petData.lastLoginDate) : null
        const isFirstLoginToday = !lastLogin || lastLogin < today

        let updateData: {
          mood?: number
          fullness?: number
          points?: number
          lastLoginDate?: Date
          lastDailyReset?: Date
          consecutiveLoginDays?: number
        } = {}

        if (needsDailyReset) {
          const newMood = Math.max(0, petData.mood - 25)
          const newFullness = Math.max(0, petData.fullness - 10)
          updateData.mood = newMood
          updateData.fullness = newFullness
          updateData.lastDailyReset = today
        }

        if (isFirstLoginToday) {
          const currentMood = updateData.mood ?? petData.mood
          updateData.mood = Math.min(100, currentMood + 5)
          updateData.lastLoginDate = now

          if (lastLogin) {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())

            if (lastLoginDate.getTime() === yesterday.getTime()) {
              const newConsecutiveDays = (petData.consecutiveLoginDays || 0) + 1
              updateData.consecutiveLoginDays = newConsecutiveDays

              if (newConsecutiveDays >= 5) {
                updateData.points = (petData.points || 0) + 20
                updateData.consecutiveLoginDays = 0
              }
            } else {
              updateData.consecutiveLoginDays = 1
            }
          } else {
            updateData.consecutiveLoginDays = 1
          }
        } else if (!petData.lastLoginDate) {
          updateData.lastLoginDate = now
          updateData.consecutiveLoginDays = 1
        }

        if (Object.keys(updateData).length > 0) {
          petData = await prisma.pet.update({
            where: { id: pet.id },
            data: updateData,
            include: {
              purchases: true,
            },
          })
        }

        return {
          ...petData,
          imageUrl: petData.imageUrl || '/cat.png',
          isUnhappy: petData.mood < 30,
          isHungry: petData.fullness < 30,
        }
      })(),
      // 2. 獲取自定義貼紙
      prisma.customSticker.findMany({
        where: { userId: userRecord.id },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          category: true,
          price: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 3. 獲取公開貼紙
      prisma.customSticker.findMany({
        where: {
          isPublic: true,
          NOT: { userId: userRecord.id },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          category: true,
          price: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 4. 獲取房間貼紙（不包含 imageUrl，稍後處理）
      prisma.roomSticker.findMany({
        where: { petId: pet.id },
        select: {
          id: true,
          stickerId: true,
          positionX: true,
          positionY: true,
          rotation: true,
          scale: true,
          layer: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // 5. 獲取貼紙庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
      // 6. 獲取食物庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
      // 7. 獲取配件
      prisma.petAccessory.findMany({
        where: { petId: pet.id },
        select: {
          id: true,
          accessoryId: true,
          positionX: true,
          positionY: true,
          rotation: true,
          scale: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // 8. 獲取配件庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
    ])

    // 處理自定義貼紙的 imageUrl
    const stickersWithImages = stickers.map((sticker) => {
      if (sticker.stickerId.startsWith('custom-')) {
        const customStickerId = sticker.stickerId.replace('custom-', '')
        const customSticker = customStickers.find((cs) => cs.id === customStickerId) ||
          publicStickers.find((ps) => ps.id === customStickerId)
        return {
          ...sticker,
          imageUrl: customSticker?.imageUrl || null,
        }
      }
      return sticker
    })

    // 格式化食物庫存（從 purchases 計算）
    if (!petData || !petData.purchases) {
      return NextResponse.json({
        pet: petData || null,
        customStickers: [],
        publicStickers: [],
        stickers: [],
        stickerInventory: [],
        foodInventory: [],
        accessories: [],
        accessoryInventory: [],
      })
    }
    
    const foodPurchases = petData.purchases.filter((p: any) =>
      p.itemId.startsWith('food') || p.itemId === 'water' || p.category === 'food'
    )

    const customFoodItemIds = foodPurchases
      .filter((p: any) => p.itemId.startsWith('custom-'))
      .map((p: any) => p.itemId.replace('custom-', ''))

    const customStickersMap = new Map<string, { imageUrl: string }>()
    customStickers.forEach((cs) => {
      if (customFoodItemIds.includes(cs.id)) {
        customStickersMap.set(`custom-${cs.id}`, { imageUrl: cs.imageUrl })
      }
    })
    publicStickers.forEach((ps) => {
      if (customFoodItemIds.includes(ps.id) && !customStickersMap.has(`custom-${ps.id}`)) {
        customStickersMap.set(`custom-${ps.id}`, { imageUrl: ps.imageUrl })
      }
    })

    const foodMap = new Map<string, any>()
    foodPurchases.forEach((p: any) => {
      const existing = foodMap.get(p.itemId)
      if (existing) {
        existing.count += p.quantity
      } else {
        const isCustom = p.itemId.startsWith('custom-')
        const emoji = isCustom ? '🖼️' : getItemEmoji(p.itemId)
        const customSticker = isCustom ? customStickersMap.get(p.itemId) : null
        
        foodMap.set(p.itemId, {
          itemId: p.itemId,
          name: p.itemName || p.name || 'Custom Food',
          emoji: emoji,
          count: p.quantity,
          imageUrl: customSticker?.imageUrl || null,
        })
      }
    })

    const formattedFoodInventory = Array.from(foodMap.values())

    // 格式化貼紙庫存（從 purchases 計算可用數量 - 包括所有裝飾品）
    const decorationPurchases = petData.purchases.filter((p: any) =>
      p.category === 'decoration' || DECOR_SHOP_CATEGORIES.includes(p.category)
    )
    
    // 計算總購買數量
    const totalBySticker: Record<string, number> = {}
    for (const purchase of decorationPurchases) {
      totalBySticker[purchase.itemId] = (totalBySticker[purchase.itemId] || 0) + purchase.quantity
    }
    
    const stickerIds = Object.keys(totalBySticker)
    
    // 計算已放置的數量
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
    
    // 格式化貼紙庫存（排除自定義貼紙）
    const formattedStickerInventoryRegular = stickerIds
      .filter((stickerId) => !stickerId.startsWith('custom-'))
      .map((stickerId) => {
        const total = totalBySticker[stickerId] || 0
        const placed = placedCounts[stickerId] || 0
        const remaining = total - placed
        if (remaining <= 0) return null
        
        const meta = SHOP_ITEM_MAP[stickerId]
        return {
          stickerId,
          name: meta?.name ?? 'Sticker',
          emoji: meta?.emoji ?? getItemEmoji(stickerId),
          count: remaining,
        }
      })
      .filter(Boolean) as any[]
    
    // 處理自定義貼紙（decoration 類別）
    const customStickerPurchases = petData.purchases.filter((p: any) =>
      p.itemId.startsWith('custom-') && (p.category === 'decoration' || DECOR_SHOP_CATEGORIES.includes(p.category))
    )
    
    let customStickerInventory: any[] = []
    if (customStickerPurchases.length > 0) {
      const customStickerIds = customStickerPurchases.map((p: any) => p.itemId.replace('custom-', ''))
      const customStickersForDecor = [
        ...customStickers.filter((cs) => customStickerIds.includes(cs.id) && cs.category === 'decoration'),
        ...publicStickers.filter((ps) => customStickerIds.includes(ps.id) && ps.category === 'decoration'),
      ]
      
      const customStickerMap = new Map(customStickersForDecor.map((cs) => [cs.id, cs]))
      
      const customTotalBySticker: Record<string, number> = {}
      for (const purchase of customStickerPurchases) {
        customTotalBySticker[purchase.itemId] = (customTotalBySticker[purchase.itemId] || 0) + purchase.quantity
      }
      
      const customStickerItemIds = customStickerPurchases.map((p: any) => p.itemId)
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
      
      const processedStickerIds = new Set<string>()
      for (const purchase of customStickerPurchases) {
        const stickerId = purchase.itemId
        if (processedStickerIds.has(stickerId)) continue
        processedStickerIds.add(stickerId)
        
        const customStickerId = stickerId.replace('custom-', '')
        const customSticker = customStickerMap.get(customStickerId)
        if (!customSticker) continue
        
        const total = customTotalBySticker[stickerId] || 0
        const placed = customPlacedCounts[stickerId] || 0
        const remaining = total - placed
        if (remaining <= 0) continue
        
        customStickerInventory.push({
          stickerId,
          name: customSticker.name,
          emoji: '🖼️',
          count: remaining,
          imageUrl: customSticker.imageUrl,
        })
      }
    }
    
    const formattedStickerInventoryWithPurchases = [
      ...formattedStickerInventoryRegular,
      ...customStickerInventory,
    ]

    // 格式化配件庫存（從 purchases 計算可用數量）
    const accessoryPurchases = petData.purchases.filter((p: any) =>
      p.itemId.startsWith('acc')
    )
    const accessoryMap = new Map<string, any>()
    accessoryPurchases.forEach((p: any) => {
      const usedCount = accessories.filter((a: any) => a.accessoryId === p.itemId).length
      const availableCount = p.quantity - usedCount
      
      if (availableCount > 0) {
        accessoryMap.set(p.itemId, {
          accessoryId: p.itemId,
          name: p.itemName || p.name || 'Accessory',
          emoji: getItemEmoji(p.itemId),
          count: availableCount,
        })
      }
    })
    // 處理自定義配件
    const customAccessoryPurchases = petData.purchases.filter((p: any) =>
      p.itemId.startsWith('custom-') && p.category === 'accessory'
    )
    
    const customAccessoryIds = customAccessoryPurchases
      .map((p: any) => p.itemId.replace('custom-', ''))
    
    const customAccessoryMap = new Map<string, any>()
    customStickers.forEach((cs) => {
      if (customAccessoryIds.includes(cs.id) && cs.category === 'accessory') {
        customAccessoryMap.set(`custom-${cs.id}`, { imageUrl: cs.imageUrl, name: cs.name })
      }
    })
    publicStickers.forEach((ps) => {
      if (customAccessoryIds.includes(ps.id) && ps.category === 'accessory' && !customAccessoryMap.has(`custom-${ps.id}`)) {
        customAccessoryMap.set(`custom-${ps.id}`, { imageUrl: ps.imageUrl, name: ps.name })
      }
    })
    
    customAccessoryPurchases.forEach((p: any) => {
      const usedCount = accessories.filter((a: any) => a.accessoryId === p.itemId).length
      const availableCount = p.quantity - usedCount
      
      if (availableCount > 0) {
        const customData = customAccessoryMap.get(p.itemId)
        accessoryMap.set(p.itemId, {
          accessoryId: p.itemId,
          name: customData?.name || p.itemName || 'Custom Accessory',
          emoji: '🖼️',
          count: availableCount,
          imageUrl: customData?.imageUrl || null,
        })
      }
    })
    
    const formattedAccessoryInventoryWithPurchases = Array.from(accessoryMap.values())

    return NextResponse.json({
      pet: petData,
      customStickers,
      publicStickers,
      stickers: stickersWithImages,
      stickerInventory: formattedStickerInventoryWithPurchases,
      foodInventory: formattedFoodInventory,
      accessories,
      accessoryInventory: formattedAccessoryInventoryWithPurchases,
    })
  } catch (error) {
    console.error('Pet room data API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch pet room data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

