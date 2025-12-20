import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP, DECOR_SHOP_CATEGORIES } from '@/data/shop-items'

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

// GET /api/dashboard-data - 合併所有 dashboard 需要的資料（不修改 schema）
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
      userBalanceData,
      petData,
      stickers,
      stickerInventory,
      foodInventory,
      accessories,
      accessoryInventory,
      unclaimedMissions,
    ] = await Promise.all([
      // 1. 計算當月餘額
      (async () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const startOfMonth = new Date(year, month - 1, 1)
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

        const transactions = await prisma.transaction.findMany({
          where: {
            userId: userRecord.id,
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            typeId: true,
            amount: true,
          },
        })

        const totalIncome = transactions
          .filter((t) => t.typeId === 2) // 2 = 收入
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const totalExpense = transactions
          .filter((t) => t.typeId === 1) // 1 = 支出
          .reduce((sum, t) => sum + Number(t.amount), 0)

        return {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
        }
      })(),
      // 2. 獲取寵物資訊
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
        const lastReset = new Date(petData.lastDailyReset)
        const shouldReset = now.toDateString() !== lastReset.toDateString()

        if (shouldReset) {
          petData = await prisma.pet.update({
            where: { id: pet.id },
            data: {
              mood: Math.max(0, petData.mood - 10),
              fullness: Math.max(0, petData.fullness - 10),
              lastDailyReset: now,
            },
            include: {
              purchases: true,
            },
          })
        }

        // 檢查是否需要關注
        const daysSinceInteraction = Math.floor(
          (now.getTime() - new Date(petData.lastLoginDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          id: petData.id,
          name: petData.name,
          imageUrl: petData.imageUrl,
          points: petData.points,
          fullness: petData.fullness,
          mood: petData.mood,
          needsAttention: daysSinceInteraction >= 3,
          daysSinceInteraction,
          purchases: petData.purchases,
        }
      })(),
      // 3. 獲取房間貼紙
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
      // 4. 獲取貼紙庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
      // 5. 獲取食物庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
      // 6. 獲取配件
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
      // 7. 獲取配件庫存（從 PetPurchase 計算，不需要單獨查詢）
      Promise.resolve([]),
      // 8. 檢查未領取的任務
      (async () => {
        const missions = await prisma.mission.findMany({
          where: {
            active: true,
          },
          select: { id: true },
        })

        const missionUsers = await prisma.missionUser.findMany({
          where: {
            userId: userRecord.id,
            missionId: { in: missions.map((m) => m.id) },
            completed: true,
            claimed: false,
          },
          select: { id: true },
        })

        return missionUsers.length > 0
      })(),
    ])

    // 格式化貼紙庫存（從 purchases 計算可用數量）
    if (!petData || !petData.purchases) {
      return NextResponse.json({
        userBalance: userBalanceData.balance,
        pet: petData || null,
        stickers: [],
        stickerInventory: [],
        foodInventory: [],
        accessories: [],
        accessoryInventory: [],
        hasUnclaimedMissions: unclaimedMissions,
      })
    }
    
    // 獲取所有裝飾品購買（包括 toy1, toy2, dec1 等）
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
    
    // 格式化貼紙庫存（排除自定義貼紙，它們會單獨處理）
    const formattedStickerInventory = stickerIds
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
    
    if (customStickerPurchases.length > 0) {
      const customStickerIds = customStickerPurchases.map((p: any) => p.itemId.replace('custom-', ''))
      const customStickersForDecor = await prisma.customSticker.findMany({
        where: {
          id: { in: customStickerIds },
          category: 'decoration',
        },
      })
      
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
        
        formattedStickerInventory.push({
          stickerId,
          name: customSticker.name,
          emoji: '🖼️',
          count: remaining,
          imageUrl: customSticker.imageUrl,
        })
      }
    }

    // 格式化食物庫存（從 purchases 計算）
    const foodPurchases = petData.purchases.filter((p: any) =>
      p.itemId.startsWith('food') || p.itemId === 'water' || p.category === 'food'
    )
    const foodMap = new Map<string, any>()
    foodPurchases.forEach((p: any) => {
      const existing = foodMap.get(p.itemId)
      if (existing) {
        existing.count += p.quantity
      } else {
        foodMap.set(p.itemId, {
          itemId: p.itemId,
          name: p.itemName || 'Food',
          emoji: getItemEmoji(p.itemId),
          count: p.quantity,
          imageUrl: null,
        })
      }
    })
    const formattedFoodInventory = Array.from(foodMap.values())

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
          name: p.itemName || 'Accessory',
          emoji: getItemEmoji(p.itemId),
          count: availableCount,
        })
      }
    })
    const formattedAccessoryInventory = Array.from(accessoryMap.values())

    return NextResponse.json({
      userBalance: userBalanceData.balance,
      pet: petData,
      stickers,
      stickerInventory: formattedStickerInventory,
      foodInventory: formattedFoodInventory,
      accessories,
      accessoryInventory: formattedAccessoryInventory,
      hasUnclaimedMissions: unclaimedMissions,
    })
  } catch (error) {
    console.error('Dashboard data API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

