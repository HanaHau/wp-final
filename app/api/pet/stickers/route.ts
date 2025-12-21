import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DECOR_SHOP_CATEGORIES, SHOP_ITEM_MAP } from '@/data/shop-items'

// 使用 revalidate 快取策略，60 秒內重用相同響應（僅對 GET 請求有效）
export const revalidate = 60

const stickerCreateSchema = z.object({
  stickerId: z.string().min(1),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  layer: z.enum(['floor', 'wall-left', 'wall-right']),
})

async function getOrCreatePet(userId: string) {
  let pet = await prisma.pet.findUnique({
    where: { userId },
  })

  if (!pet) {
    const now = new Date()
    pet = await prisma.pet.create({
      data: {
        userId,
        name: '我的寵物',
        points: 0,
        fullness: 70,
        mood: 70,
        lastLoginDate: now,
        lastDailyReset: now,
        consecutiveLoginDays: 0, // 初始連續登入天數為 0
      },
    })
  }

  return pet
}

async function hasStickerInventory(petId: string, stickerId: string, userId: string) {
  // Custom stickers (starting with "custom-")
  if (stickerId.startsWith('custom-')) {
    const customStickerId = stickerId.replace('custom-', '')
    const customSticker = await prisma.customSticker.findUnique({
      where: { id: customStickerId },
    })
    
    if (!customSticker) return false
    
    // Check if user has purchased this custom sticker
    const purchase = await prisma.petPurchase.findFirst({
      where: {
        petId,
        itemId: stickerId,
        quantity: { gt: 0 },
      },
    })
    
    if (!purchase) return false
    
    // Check if user has available quantity (total purchased - placed)
    const totalPurchased = await prisma.petPurchase.aggregate({
      _sum: { quantity: true },
      where: {
        petId,
        itemId: stickerId,
      },
    })
    
    const placedCount = await prisma.roomSticker.count({
      where: {
        petId,
        stickerId,
      },
    })
    
    const purchasedQty = totalPurchased._sum.quantity ?? 0
    return purchasedQty > placedCount
  }

  const itemMeta = SHOP_ITEM_MAP[stickerId]
  if (!itemMeta || !DECOR_SHOP_CATEGORIES.includes(itemMeta.category)) {
    // 預設貼紙或非可裝飾商品不限制數量
    return true
  }

  const totalPurchased = await prisma.petPurchase.aggregate({
    _sum: { quantity: true },
    where: {
      petId,
      itemId: stickerId,
    },
  })

  const placedCount = await prisma.roomSticker.count({
    where: {
      petId,
      stickerId,
    },
  })

  const purchasedQty = totalPurchased._sum.quantity ?? 0
  return purchasedQty > placedCount
}

// GET /api/pet/stickers - 取得房間貼紙
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    const pet = await getOrCreatePet(userRecord.id)

    const stickers = await prisma.roomSticker.findMany({
      where: { petId: pet.id },
      orderBy: { createdAt: 'asc' },
    })

    // Enrich stickers with imageUrl for custom stickers
    const enrichedStickers = await Promise.all(
      stickers.map(async (sticker) => {
        if (sticker.stickerId.startsWith('custom-')) {
          const customStickerId = sticker.stickerId.replace('custom-', '')
          const customSticker = await prisma.customSticker.findUnique({
            where: { id: customStickerId },
            select: { imageUrl: true },
          })
          return {
            ...sticker,
            imageUrl: customSticker?.imageUrl || null,
          }
        }
        return sticker
      })
    )

    return NextResponse.json(enrichedStickers)
  } catch (error) {
    console.error('Get stickers error:', error)
    return NextResponse.json({ error: 'Failed to get stickers' }, { status: 500 })
  }
}

// POST /api/pet/stickers - 新增貼紙（房間裝飾）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    const body = await request.json()
    const payload = stickerCreateSchema.parse(body)

    const pet = await getOrCreatePet(userRecord.id)

    // Use a transaction to atomically check inventory and create sticker
    // This prevents race conditions when placing multiple stickers quickly
    const result = await prisma.$transaction(async (tx) => {
      // Check inventory within transaction to get accurate count
      const canUseSticker = await hasStickerInventoryInTx(tx, pet.id, payload.stickerId, userRecord.id)
      if (!canUseSticker) {
        throw new Error('No available stickers. Please purchase this item first or check your inventory.')
      }

      // Create sticker
      const sticker = await tx.roomSticker.create({
        data: {
          petId: pet.id,
          stickerId: payload.stickerId,
          positionX: payload.positionX,
          positionY: payload.positionY,
          rotation: payload.rotation ?? 0,
          scale: payload.scale ?? 1,
          layer: payload.layer,
        },
      })

      return sticker
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create sticker error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const statusCode = errorMessage.includes('No available stickers') ? 400 : 500
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Transaction-safe version of hasStickerInventory
async function hasStickerInventoryInTx(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  petId: string,
  stickerId: string,
  userId: string
) {
  // Custom stickers (starting with "custom-")
  if (stickerId.startsWith('custom-')) {
    const customStickerId = stickerId.replace('custom-', '')
    const customSticker = await tx.customSticker.findUnique({
      where: { id: customStickerId },
    })
    
    if (!customSticker) return false
    
    // Check if user has purchased this custom sticker
    const purchase = await tx.petPurchase.findFirst({
      where: {
        petId,
        itemId: stickerId,
        quantity: { gt: 0 },
      },
    })
    
    if (!purchase) return false
    
    // Check if user has available quantity (total purchased - placed)
    const totalPurchased = await tx.petPurchase.aggregate({
      _sum: { quantity: true },
      where: {
        petId,
        itemId: stickerId,
      },
    })
    
    const placedCount = await tx.roomSticker.count({
      where: {
        petId,
        stickerId,
      },
    })
    
    const purchasedQty = totalPurchased._sum.quantity ?? 0
    return purchasedQty > placedCount
  }

  const itemMeta = SHOP_ITEM_MAP[stickerId]
  if (!itemMeta || !DECOR_SHOP_CATEGORIES.includes(itemMeta.category)) {
    // 預設貼紙或非可裝飾商品不限制數量
    return true
  }

  const totalPurchased = await tx.petPurchase.aggregate({
    _sum: { quantity: true },
    where: {
      petId,
      itemId: stickerId,
    },
  })

  const placedCount = await tx.roomSticker.count({
    where: {
      petId,
      stickerId,
    },
  })

  const purchasedQty = totalPurchased._sum.quantity ?? 0
  return purchasedQty > placedCount
}

