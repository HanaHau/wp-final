import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP, DECOR_SHOP_CATEGORIES, type ShopItemCategory } from '@/data/shop-items'
import type { DashboardSummary } from '@/contexts/DashboardContext'

export async function getDashboardSummary(userRecordParam?: Awaited<ReturnType<typeof getCurrentUserRecord>>): Promise<DashboardSummary | null> {
  try {
    // 如果提供了用戶記錄參數，使用它；否則查詢
    const userRecord = userRecordParam || await getCurrentUserRecord()
    if (!userRecord) {
      return null
    }

    // 獲取或創建 pet（如果不存在則創建，這需要先查詢）
    let pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
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
      })
    }

    // 處理每日重置邏輯（與 /api/pet 相同）
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastReset = pet.lastDailyReset ? new Date(pet.lastDailyReset) : null
    const needsDailyReset = !lastReset || lastReset < today
    const lastLogin = pet.lastLoginDate ? new Date(pet.lastLoginDate) : null
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
      const newMood = Math.max(0, pet.mood - 25)
      const newFullness = Math.max(0, pet.fullness - 10)
      updateData.mood = newMood
      updateData.fullness = newFullness
      updateData.lastDailyReset = today
    }

    if (isFirstLoginToday) {
      const currentMood = updateData.mood ?? pet.mood
      updateData.mood = Math.min(100, currentMood + 5)
      updateData.lastLoginDate = now

      if (lastLogin) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())

        if (lastLoginDate.getTime() === yesterday.getTime()) {
          const newConsecutiveDays = (pet.consecutiveLoginDays || 0) + 1
          updateData.consecutiveLoginDays = newConsecutiveDays

          if (newConsecutiveDays >= 5) {
            updateData.points = (pet.points || 0) + 20
            updateData.consecutiveLoginDays = 0
          }
        } else {
          updateData.consecutiveLoginDays = 1
        }
      } else {
        updateData.consecutiveLoginDays = 1
      }
    } else if (!pet.lastLoginDate) {
      updateData.lastLoginDate = now
      updateData.consecutiveLoginDays = 1
    }

    if (Object.keys(updateData).length > 0) {
      pet = await prisma.pet.update({
        where: { id: pet.id },
        data: updateData,
      })
    }

    // 準備並行查詢的參數
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // 計算當月統計的日期範圍（台灣時區）
    const startDateTaiwan = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const startDate = new Date(startDateTaiwan.getTime() - 8 * 60 * 60 * 1000)
    const lastDay = new Date(year, month, 0).getDate()
    const endDateTaiwan = new Date(year, month - 1, lastDay, 23, 59, 59, 999)
    const endDate = new Date(endDateTaiwan.getTime() - 8 * 60 * 60 * 1000)

    // 並行執行所有查詢
    const [
      transactions,
      recentTransactions,
      roomStickers,
      petPurchases,
      placedStickers,
      placedAccessories,
      completedMissions,
      friendInvitations,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: userRecord.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      // 獲取最近 10 筆交易（供 transactions 頁使用）
      prisma.transaction.findMany({
        where: {
          userId: userRecord.id,
        },
        include: {
          category: true,
          type: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 10,
      }),
      prisma.roomSticker.findMany({
        where: { petId: pet.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.petPurchase.findMany({
        where: { petId: pet.id },
      }),
      prisma.roomSticker.groupBy({
        by: ['stickerId'],
        _count: true,
        where: { petId: pet.id },
      }),
      prisma.petAccessory.groupBy({
        by: ['accessoryId'],
        _count: true,
        where: { petId: pet.id },
      }),
      prisma.missionUser.findMany({
        where: {
          userId: userRecord.id,
          completed: true,
          claimed: false,
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        include: {
          mission: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.friend.count({
        where: {
          friendId: userRecord.id,
          status: 'PENDING',
        },
      }),
    ])

    // 處理當月統計
    const totalExpense = transactions
      .filter((t) => t.typeId === 1)
      .reduce((sum, t) => sum + t.amount, 0)
    const totalIncome = transactions
      .filter((t) => t.typeId === 2)
      .reduce((sum, t) => sum + t.amount, 0)

    const dailyStats: Record<string, { expense: number; income: number }> = {}
    transactions.forEach((t) => {
      const utcTime = t.date.getTime()
      const taiwanTime = utcTime + 8 * 60 * 60 * 1000
      const taiwanDate = new Date(taiwanTime)
      const dateKey = taiwanDate.toISOString().split('T')[0]
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { expense: 0, income: 0 }
      }
      if (t.typeId === 1) dailyStats[dateKey].expense += t.amount
      if (t.typeId === 2) dailyStats[dateKey].income += t.amount
    })

    // 處理房間貼紙和自定義貼紙庫存（合併查詢以減少數據庫調用）
    // 提前提取所有需要的 custom sticker IDs
    const customStickerIds = roomStickers
      .filter((s) => s.stickerId.startsWith('custom-'))
      .map((s) => s.stickerId.replace('custom-', ''))
    
    // 提取庫存中需要的 custom sticker IDs
    const customStickerPurchases = petPurchases.filter((p) => p.itemId.startsWith('custom-'))
    const customStickerIdsForInventory = customStickerPurchases.map((p) =>
      p.itemId.replace('custom-', '')
    )
    
    // 合併所有需要的 custom sticker IDs，一次性查詢（減少數據庫查詢次數）
    const allCustomStickerIds = Array.from(new Set([...customStickerIds, ...customStickerIdsForInventory]))
    const allCustomStickers = allCustomStickerIds.length > 0
      ? await prisma.customSticker.findMany({
          where: { id: { in: allCustomStickerIds } },
          select: { id: true, imageUrl: true, name: true, category: true },
        })
      : []
    
    // 創建多個 Map 以便快速查找
    const customStickerMap = new Map(allCustomStickers.map((cs) => [cs.id, cs.imageUrl]))
    const customStickerMapForInventory = new Map(allCustomStickers.map((cs) => [cs.id, cs]))
    const enrichedStickers = roomStickers.map((sticker) => {
      const baseSticker = {
        id: sticker.id,
        stickerId: sticker.stickerId,
        positionX: sticker.positionX,
        positionY: sticker.positionY,
        rotation: sticker.rotation,
        scale: sticker.scale,
        layer: sticker.layer as 'floor' | 'wall-left' | 'wall-right',
      }
      if (sticker.stickerId.startsWith('custom-')) {
        const customStickerId = sticker.stickerId.replace('custom-', '')
        return {
          ...baseSticker,
          imageUrl: customStickerMap.get(customStickerId) || null,
        }
      }
      return baseSticker
    })

    // 處理貼紙庫存
    const placedStickerCounts = new Map(placedStickers.map((p) => [p.stickerId, p._count]))
    const stickerPurchases = petPurchases.filter((p) => {
      const category = p.category as ShopItemCategory
      return DECOR_SHOP_CATEGORIES.includes(category)
    })
    const stickerTotalByItem: Record<string, number> = {}
    stickerPurchases.forEach((p) => {
      stickerTotalByItem[p.itemId] = (stickerTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularStickerIds = Object.keys(stickerTotalByItem).filter((id) => !id.startsWith('custom-'))
    const availableStickers: Array<{
      stickerId: string
      name: string
      emoji: string
      count: number
      imageUrl?: string | null
    }> = regularStickerIds
      .map((stickerId) => {
        const total = stickerTotalByItem[stickerId] || 0
        const placed = placedStickerCounts.get(stickerId) || 0
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
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // 處理自定義貼紙庫存（customStickerPurchases 和 customStickerMapForInventory 已經在上面處理）
    // 注意：customStickerPurchases 和 customStickerMapForInventory 已經在上面定義
    if (customStickerPurchases.length > 0) {

      const customTotalBySticker: Record<string, number> = {}
      customStickerPurchases.forEach((p) => {
        customTotalBySticker[p.itemId] = (customTotalBySticker[p.itemId] || 0) + p.quantity
      })

      const processedStickerIds = new Set<string>()
      customStickerPurchases.forEach((purchase) => {
        const stickerId = purchase.itemId
        if (processedStickerIds.has(stickerId)) return
        processedStickerIds.add(stickerId)

        const customStickerId = stickerId.replace('custom-', '')
        const customSticker = customStickerMapForInventory.get(customStickerId)
        if (!customSticker) return

        const total = customTotalBySticker[stickerId] || 0
        const placed = placedStickerCounts.get(stickerId) || 0
        const remaining = total - placed
        if (remaining <= 0) return

        availableStickers.push({
          stickerId,
          name: customSticker.name,
          emoji: '🖼️',
          imageUrl: customSticker.imageUrl,
          count: remaining,
        })
      })
    }

    // 處理食物庫存
    const foodPurchases = petPurchases.filter((p) => p.category === 'food')
    const foodTotalByItem: Record<string, number> = {}
    foodPurchases.forEach((p) => {
      foodTotalByItem[p.itemId] = (foodTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularFoodItemIds = Object.keys(foodTotalByItem).filter((id) => !id.startsWith('custom-'))
    const customFoodItemIds = Object.keys(foodTotalByItem).filter((id) => id.startsWith('custom-'))

    const foodItems: Array<{
      itemId: string
      name: string
      emoji: string
      count: number
      imageUrl: string | null
    }> = []

    regularFoodItemIds.forEach((itemId) => {
      const total = foodTotalByItem[itemId] || 0
      if (total <= 0) return
      const meta = SHOP_ITEM_MAP[itemId]
      if (!meta || meta.category !== 'food') return
      foodItems.push({
        itemId,
        name: meta.name,
        emoji: meta.emoji,
        count: total,
        imageUrl: null,
      })
    })

    if (customFoodItemIds.length > 0) {
      const customFoodStickerIds = customFoodItemIds.map((id) => id.replace('custom-', ''))
      const customFoodStickers = await prisma.customSticker.findMany({
        where: {
          id: { in: customFoodStickerIds },
          category: 'food',
        },
      })
      const customFoodStickerMap = new Map(customFoodStickers.map((cs) => [cs.id, cs]))

      customFoodItemIds.forEach((itemId) => {
        const total = foodTotalByItem[itemId] || 0
        if (total <= 0) return
        const customStickerId = itemId.replace('custom-', '')
        const customSticker = customFoodStickerMap.get(customStickerId)
        if (!customSticker) return
        foodItems.push({
          itemId,
          name: customSticker.name,
          emoji: '🖼️',
          count: total,
          imageUrl: customSticker.imageUrl,
        })
      })
    }

    // 處理配件列表（enrich with custom accessory imageUrl）
    const accessories = await prisma.petAccessory.findMany({
      where: { petId: pet.id },
      orderBy: { createdAt: 'asc' },
    })

    const customAccessoryIds = accessories
      .filter((a) => a.accessoryId.startsWith('custom-'))
      .map((a) => a.accessoryId.replace('custom-', ''))
    const customAccessoriesForList = customAccessoryIds.length > 0
      ? await prisma.customSticker.findMany({
          where: { id: { in: customAccessoryIds } },
          select: { id: true, imageUrl: true },
        })
      : []
    const customAccessoryMapForList = new Map(
      customAccessoriesForList.map((ca) => [ca.id, ca.imageUrl])
    )

    const enrichedAccessories = accessories.map((accessory) => {
      if (accessory.accessoryId.startsWith('custom-')) {
        const customAccessoryId = accessory.accessoryId.replace('custom-', '')
        return {
          ...accessory,
          imageUrl: customAccessoryMapForList.get(customAccessoryId) || null,
        }
      }
      return {
        ...accessory,
        imageUrl: null,
      }
    })

    // 處理配件庫存
    const placedAccessoryCounts = new Map(placedAccessories.map((p) => [p.accessoryId, p._count]))
    const accessoryPurchases = petPurchases.filter((p) => p.category === 'accessory')
    const accessoryTotalByItem: Record<string, number> = {}
    accessoryPurchases.forEach((p) => {
      accessoryTotalByItem[p.itemId] = (accessoryTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularAccessoryIds = Object.keys(accessoryTotalByItem).filter(
      (id) => !id.startsWith('custom-')
    )
    const availableAccessories: Array<{
      accessoryId: string
      name: string
      emoji: string
      count: number
      imageUrl?: string | null
    }> = regularAccessoryIds
      .map((accessoryId) => {
        const total = accessoryTotalByItem[accessoryId] || 0
        const placed = placedAccessoryCounts.get(accessoryId) || 0
        const remaining = total - placed
        if (remaining <= 0) return null
        const meta = SHOP_ITEM_MAP[accessoryId]
        return {
          accessoryId,
          name: meta?.name ?? 'Accessory',
          emoji: meta?.emoji ?? '🎀',
          count: remaining,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // 處理自定義配件庫存
    const customAccessoryPurchases = petPurchases.filter(
      (p) => p.itemId.startsWith('custom-') && p.category === 'accessory'
    )
    if (customAccessoryPurchases.length > 0) {
      const customAccessoryIdsForInventory = customAccessoryPurchases.map((p) =>
        p.itemId.replace('custom-', '')
      )
      const customAccessoriesForInventory = await prisma.customSticker.findMany({
        where: {
          id: { in: customAccessoryIdsForInventory },
          category: 'accessory',
        },
      })
      const customAccessoryMapForInventory = new Map(
        customAccessoriesForInventory.map((ca) => [ca.id, ca])
      )

      const customTotalByAccessory: Record<string, number> = {}
      customAccessoryPurchases.forEach((p) => {
        customTotalByAccessory[p.itemId] = (customTotalByAccessory[p.itemId] || 0) + p.quantity
      })

      const processedAccessoryIds = new Set<string>()
      customAccessoryPurchases.forEach((purchase) => {
        const accessoryId = purchase.itemId
        if (processedAccessoryIds.has(accessoryId)) return
        processedAccessoryIds.add(accessoryId)

        const customAccessoryId = accessoryId.replace('custom-', '')
        const customAccessory = customAccessoryMapForInventory.get(customAccessoryId)
        if (!customAccessory) return

        const total = customTotalByAccessory[accessoryId] || 0
        const placed = placedAccessoryCounts.get(accessoryId) || 0
        const remaining = total - placed
        if (remaining <= 0) return

        availableAccessories.push({
          accessoryId,
          name: customAccessory.name,
          emoji: '🖼️',
          imageUrl: customAccessory.imageUrl,
          count: remaining,
        })
      })
    }

    // 處理未領取的任務
    const unclaimedMissions = completedMissions.map((m) => ({
      missionId: m.mission.code,
      missionCode: m.mission.code,
      name: m.mission.title,
      points: m.mission.reward,
      type: m.mission.type,
    }))

    // 處理最近交易（格式化供前端使用）
    const formattedRecentTransactions = recentTransactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      category: t.category.name,
      type: t.type.name,
      date: t.date.toISOString(),
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    }))

    // 構建響應
    return {
      monthly: {
        year,
        month,
        totalExpense,
        totalIncome,
        dailyStats,
        transactionCount: transactions.length,
      },
      pet: {
        ...pet,
        purchases: [],
        imageUrl: pet.imageUrl || '/cat.png',
        isUnhappy: pet.mood < 30,
        isHungry: pet.fullness < 30,
      },
      stickers: enrichedStickers,
      stickerInventory: availableStickers,
      foodInventory: foodItems,
      accessories: enrichedAccessories,
      accessoryInventory: availableAccessories,
      unclaimedMissions: {
        missions: unclaimedMissions,
      },
      invitationCount: {
        count: friendInvitations,
      },
      recentTransactions: formattedRecentTransactions,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        userID: userRecord.userID,
        name: userRecord.name,
        image: userRecord.image,
      },
    }
  } catch (error) {
    console.error('取得 dashboard summary 錯誤:', error)
    return null
  }
}

// Fast summary - 只返回快速資料（pet, stickers, accessories, inventory, missions, invitations）
// 不包含 transactions 統計和 recentTransactions（這些可以 lazy load）
export async function getDashboardSummaryFast(): Promise<Partial<DashboardSummary> | null> {
  try {
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      return null
    }

    // 獲取或創建 pet
    let pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
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
      })
    }

    // 處理每日重置邏輯
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastReset = pet.lastDailyReset ? new Date(pet.lastDailyReset) : null
    const needsDailyReset = !lastReset || lastReset < today
    const lastLogin = pet.lastLoginDate ? new Date(pet.lastLoginDate) : null
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
      const newMood = Math.max(0, pet.mood - 25)
      const newFullness = Math.max(0, pet.fullness - 10)
      updateData.mood = newMood
      updateData.fullness = newFullness
      updateData.lastDailyReset = today
    }

    if (isFirstLoginToday) {
      const currentMood = updateData.mood ?? pet.mood
      updateData.mood = Math.min(100, currentMood + 5)
      updateData.lastLoginDate = now

      if (lastLogin) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())

        if (lastLoginDate.getTime() === yesterday.getTime()) {
          const newConsecutiveDays = (pet.consecutiveLoginDays || 0) + 1
          updateData.consecutiveLoginDays = newConsecutiveDays

          if (newConsecutiveDays >= 5) {
            updateData.points = (pet.points || 0) + 20
            updateData.consecutiveLoginDays = 0
          }
        } else {
          updateData.consecutiveLoginDays = 1
        }
      } else {
        updateData.consecutiveLoginDays = 1
      }
    } else if (!pet.lastLoginDate) {
      updateData.lastLoginDate = now
      updateData.consecutiveLoginDays = 1
    }

    if (Object.keys(updateData).length > 0) {
      pet = await prisma.pet.update({
        where: { id: pet.id },
        data: updateData,
      })
    }

    // 並行查詢快速資料（不包含 transactions）
    const [
      roomStickers,
      petPurchases,
      placedStickers,
      placedAccessories,
      completedMissions,
      friendInvitations,
      petAccessories,
    ] = await Promise.all([
      prisma.roomSticker.findMany({
        where: { petId: pet.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.petPurchase.findMany({
        where: { petId: pet.id },
      }),
      prisma.roomSticker.groupBy({
        by: ['stickerId'],
        _count: true,
        where: { petId: pet.id },
      }),
      prisma.petAccessory.groupBy({
        by: ['accessoryId'],
        _count: true,
        where: { petId: pet.id },
      }),
      prisma.missionUser.findMany({
        where: {
          userId: userRecord.id,
          completed: true,
          claimed: false,
          completedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        include: {
          mission: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.friend.count({
        where: {
          friendId: userRecord.id,
          status: 'PENDING',
        },
      }),
      prisma.petAccessory.findMany({
        where: { petId: pet.id },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // 收集所有 custom sticker IDs（房間貼紙 + 食物 + 配件）
    const allCustomStickerIds = new Set<string>()
    roomStickers.forEach((s) => {
      if (s.stickerId.startsWith('custom-')) {
        allCustomStickerIds.add(s.stickerId.replace('custom-', ''))
      }
    })
    petPurchases.forEach((p) => {
      if (p.itemId.startsWith('custom-')) {
        allCustomStickerIds.add(p.itemId.replace('custom-', ''))
      }
    })

    // 一次性查詢所有 custom stickers
    const customStickers = allCustomStickerIds.size > 0
      ? await prisma.customSticker.findMany({
          where: { id: { in: Array.from(allCustomStickerIds) } },
        })
      : []
    const customStickerMap = new Map(customStickers.map((cs) => [cs.id, cs.imageUrl]))
    const enrichedStickers = roomStickers.map((sticker) => {
      const baseSticker = {
        id: sticker.id,
        stickerId: sticker.stickerId,
        positionX: sticker.positionX,
        positionY: sticker.positionY,
        rotation: sticker.rotation,
        scale: sticker.scale,
        layer: sticker.layer as 'floor' | 'wall-left' | 'wall-right',
      }
      if (sticker.stickerId.startsWith('custom-')) {
        const customStickerId = sticker.stickerId.replace('custom-', '')
        return {
          ...baseSticker,
          imageUrl: customStickerMap.get(customStickerId) || null,
        }
      }
      return baseSticker
    })

    // 處理貼紙庫存（重用原邏輯）
    const placedStickerCounts = new Map(placedStickers.map((p) => [p.stickerId, p._count]))
    const stickerPurchases = petPurchases.filter((p) => {
      const category = p.category as ShopItemCategory
      return DECOR_SHOP_CATEGORIES.includes(category)
    })
    const stickerTotalByItem: Record<string, number> = {}
    stickerPurchases.forEach((p) => {
      stickerTotalByItem[p.itemId] = (stickerTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularStickerIds = Object.keys(stickerTotalByItem).filter((id) => !id.startsWith('custom-'))
    const availableStickers: Array<{
      stickerId: string
      name: string
      emoji: string
      count: number
      imageUrl?: string | null
    }> = regularStickerIds
      .map((stickerId) => {
        const total = stickerTotalByItem[stickerId] || 0
        const placed = placedStickerCounts.get(stickerId) || 0
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
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // 處理自定義貼紙庫存（使用已查詢的 customStickers）
    const customStickerMap2 = new Map(customStickers.filter((cs) => cs.category === 'decoration').map((cs) => [cs.id, cs]))
    const customStickerPurchases = petPurchases.filter((p) => p.itemId.startsWith('custom-') && p.category === 'decoration')
    if (customStickerPurchases.length > 0) {
      const customTotalBySticker: Record<string, number> = {}
      customStickerPurchases.forEach((p) => {
        customTotalBySticker[p.itemId] = (customTotalBySticker[p.itemId] || 0) + p.quantity
      })

      const processedStickerIds = new Set<string>()
      customStickerPurchases.forEach((purchase) => {
        const stickerId = purchase.itemId
        if (processedStickerIds.has(stickerId)) return
        processedStickerIds.add(stickerId)

        const customStickerId = stickerId.replace('custom-', '')
        const customSticker = customStickerMap2.get(customStickerId)
        if (!customSticker) return

        const total = customTotalBySticker[stickerId] || 0
        const placed = placedStickerCounts.get(stickerId) || 0
        const remaining = total - placed
        if (remaining <= 0) return

        availableStickers.push({
          stickerId,
          name: customSticker.name,
          emoji: '🖼️',
          imageUrl: customSticker.imageUrl,
          count: remaining,
        })
      })
    }

    // 處理食物庫存（重用原邏輯）
    const foodPurchases = petPurchases.filter((p) => p.category === 'food')
    const foodTotalByItem: Record<string, number> = {}
    foodPurchases.forEach((p) => {
      foodTotalByItem[p.itemId] = (foodTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularFoodItemIds = Object.keys(foodTotalByItem).filter((id) => !id.startsWith('custom-'))
    const customFoodItemIds = Object.keys(foodTotalByItem).filter((id) => id.startsWith('custom-'))

    const foodItems: Array<{
      itemId: string
      name: string
      emoji: string
      count: number
      imageUrl: string | null
    }> = []

    regularFoodItemIds.forEach((itemId) => {
      const total = foodTotalByItem[itemId] || 0
      if (total <= 0) return
      const meta = SHOP_ITEM_MAP[itemId]
      if (!meta || meta.category !== 'food') return
      foodItems.push({
        itemId,
        name: meta.name,
        emoji: meta.emoji,
        count: total,
        imageUrl: null,
      })
    })

    if (customFoodItemIds.length > 0) {
      const customFoodStickerMap = new Map(customStickers.filter((cs) => cs.category === 'food').map((cs) => [cs.id, cs]))
      customFoodItemIds.forEach((itemId) => {
        const total = foodTotalByItem[itemId] || 0
        if (total <= 0) return
        const customStickerId = itemId.replace('custom-', '')
        const customSticker = customFoodStickerMap.get(customStickerId)
        if (!customSticker) return
        foodItems.push({
          itemId,
          name: customSticker.name,
          emoji: '🖼️',
          count: total,
          imageUrl: customSticker.imageUrl,
        })
      })
    }

    // 處理配件列表（使用已查詢的 petAccessories）
    const customAccessoryStickerMap = new Map(customStickers.filter((cs) => cs.category === 'accessory').map((cs) => [cs.id, cs.imageUrl]))
    const enrichedAccessories = petAccessories.map((accessory) => {
      if (accessory.accessoryId.startsWith('custom-')) {
        const customAccessoryId = accessory.accessoryId.replace('custom-', '')
        return {
          ...accessory,
          imageUrl: customAccessoryStickerMap.get(customAccessoryId) || null,
        }
      }
      return {
        ...accessory,
        imageUrl: null,
      }
    })

    // 處理配件庫存（重用原邏輯）
    const placedAccessoryCounts = new Map(placedAccessories.map((p) => [p.accessoryId, p._count]))
    const accessoryPurchases = petPurchases.filter((p) => p.category === 'accessory')
    const accessoryTotalByItem: Record<string, number> = {}
    accessoryPurchases.forEach((p) => {
      accessoryTotalByItem[p.itemId] = (accessoryTotalByItem[p.itemId] || 0) + p.quantity
    })

    const regularAccessoryIds = Object.keys(accessoryTotalByItem).filter(
      (id) => !id.startsWith('custom-')
    )
    const availableAccessories: Array<{
      accessoryId: string
      name: string
      emoji: string
      count: number
      imageUrl?: string | null
    }> = regularAccessoryIds
      .map((accessoryId) => {
        const total = accessoryTotalByItem[accessoryId] || 0
        const placed = placedAccessoryCounts.get(accessoryId) || 0
        const remaining = total - placed
        if (remaining <= 0) return null
        const meta = SHOP_ITEM_MAP[accessoryId]
        return {
          accessoryId,
          name: meta?.name ?? 'Accessory',
          emoji: meta?.emoji ?? '🎀',
          count: remaining,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // 處理自定義配件庫存（使用已查詢的 customStickers）
    const customAccessoryMapForInventory = new Map(customStickers.filter((cs) => cs.category === 'accessory').map((cs) => [cs.id, cs]))
    const customAccessoryPurchases = petPurchases.filter(
      (p) => p.itemId.startsWith('custom-') && p.category === 'accessory'
    )
    if (customAccessoryPurchases.length > 0) {
      const customTotalByAccessory: Record<string, number> = {}
      customAccessoryPurchases.forEach((p) => {
        customTotalByAccessory[p.itemId] = (customTotalByAccessory[p.itemId] || 0) + p.quantity
      })

      const processedAccessoryIds = new Set<string>()
      customAccessoryPurchases.forEach((purchase) => {
        const accessoryId = purchase.itemId
        if (processedAccessoryIds.has(accessoryId)) return
        processedAccessoryIds.add(accessoryId)

        const customAccessoryId = accessoryId.replace('custom-', '')
        const customAccessory = customAccessoryMapForInventory.get(customAccessoryId)
        if (!customAccessory) return

        const total = customTotalByAccessory[accessoryId] || 0
        const placed = placedAccessoryCounts.get(accessoryId) || 0
        const remaining = total - placed
        if (remaining <= 0) return

        availableAccessories.push({
          accessoryId,
          name: customAccessory.name,
          emoji: '🖼️',
          imageUrl: customAccessory.imageUrl,
          count: remaining,
        })
      })
    }

    // 處理未領取的任務
    const unclaimedMissions = completedMissions.map((m) => ({
      missionId: m.mission.code,
      missionCode: m.mission.code,
      name: m.mission.title,
      points: m.mission.reward,
      type: m.mission.type,
    }))

    // 構建快速響應（不包含 monthly 和 recentTransactions）
    return {
      pet: {
        ...pet,
        purchases: [],
        imageUrl: pet.imageUrl || '/cat.png',
        isUnhappy: pet.mood < 30,
        isHungry: pet.fullness < 30,
      },
      stickers: enrichedStickers,
      stickerInventory: availableStickers,
      foodInventory: foodItems,
      accessories: enrichedAccessories,
      accessoryInventory: availableAccessories,
      unclaimedMissions: {
        missions: unclaimedMissions,
      },
      invitationCount: {
        count: friendInvitations,
      },
      user: {
        id: userRecord.id,
        email: userRecord.email,
        userID: userRecord.userID,
        name: userRecord.name,
        image: userRecord.image,
      },
    }
  } catch (error) {
    console.error('取得 dashboard summary fast 錯誤:', error)
    return null
  }
}

