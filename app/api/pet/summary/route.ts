import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

// GET /api/pet/summary - 聚合 pet 頁面需要的所有資料
export async function GET(request: NextRequest) {
  try {
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addCorsHeaders(response, request)
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

    // 並行獲取所有需要的資料
    const [roomStickers, accessories, customStickers, publicStickers] = await Promise.all([
      // 房間貼紙
      prisma.roomSticker.findMany({
        where: { petId: pet.id },
        orderBy: { createdAt: 'asc' },
      }),

      // 配件
      prisma.petAccessory.findMany({
        where: { petId: pet.id },
        orderBy: { createdAt: 'asc' },
      }),

      // 自定義貼紙（own）
      prisma.customSticker.findMany({
        where: { userId: userRecord.id },
        orderBy: { createdAt: 'desc' },
      }),

      // 公開貼紙
      prisma.customSticker.findMany({
        where: { isPublic: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Enrich stickers with custom sticker imageUrl
    const customStickerIds = roomStickers
      .filter((s) => s.stickerId.startsWith('custom-'))
      .map((s) => s.stickerId.replace('custom-', ''))
    const customStickersForStickers = customStickerIds.length > 0
      ? await prisma.customSticker.findMany({
          where: { id: { in: customStickerIds } },
          select: { id: true, imageUrl: true },
        })
      : []
    const customStickerMap = new Map(customStickersForStickers.map((cs) => [cs.id, cs.imageUrl]))
    const enrichedStickers = roomStickers.map((sticker) => {
      if (sticker.stickerId.startsWith('custom-')) {
        const customStickerId = sticker.stickerId.replace('custom-', '')
        return {
          ...sticker,
          imageUrl: customStickerMap.get(customStickerId) || null,
        }
      }
      return sticker
    })

    // Enrich accessories with custom accessory imageUrl
    const customAccessoryIds = accessories
      .filter((a) => a.accessoryId.startsWith('custom-'))
      .map((a) => a.accessoryId.replace('custom-', ''))
    const customAccessoriesForList = customAccessoryIds.length > 0
      ? await prisma.customSticker.findMany({
          where: { id: { in: customAccessoryIds } },
          select: { id: true, imageUrl: true },
        })
      : []
    const customAccessoryMap = new Map(
      customAccessoriesForList.map((ca) => [ca.id, ca.imageUrl])
    )

    const enrichedAccessories = accessories.map((accessory) => {
      if (accessory.accessoryId.startsWith('custom-')) {
        const customAccessoryId = accessory.accessoryId.replace('custom-', '')
        return {
          ...accessory,
          imageUrl: customAccessoryMap.get(customAccessoryId) || null,
        }
      }
      return {
        ...accessory,
        imageUrl: null,
      }
    })

    // 獲取 purchases 用於計算 food items 和 available items
    const purchases = await prisma.petPurchase.findMany({
      where: { petId: pet.id },
    })

    // 構建響應
    const summary = {
      pet: {
        ...pet,
        purchases: purchases.map(p => ({
          id: p.id,
          itemId: p.itemId,
          itemName: p.itemName,
          category: p.category,
          cost: p.cost,
          quantity: p.quantity,
          purchasedAt: p.purchasedAt,
        })),
        imageUrl: pet.imageUrl || '/cat.png',
        isUnhappy: pet.mood < 30,
        isHungry: pet.fullness < 30,
      },
      stickers: enrichedStickers,
      accessories: enrichedAccessories,
      customStickers,
      publicStickers,
    }

    const response = NextResponse.json(summary)
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('取得 pet summary 錯誤:', error)
    const response = NextResponse.json(
      { error: 'Failed to get pet summary' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

