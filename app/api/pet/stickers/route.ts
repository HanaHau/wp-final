import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DECOR_SHOP_CATEGORIES, SHOP_ITEM_MAP } from '@/data/shop-items'

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
    pet = await prisma.pet.create({
      data: {
        userId,
        name: '我的寵物',
        points: 0,
        fullness: 50,
        mood: 50,
        health: 100,
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pet = await getOrCreatePet(user.id)

    const stickers = await prisma.roomSticker.findMany({
      where: { petId: pet.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(stickers)
  } catch (error) {
    console.error('Get stickers error:', error)
    return NextResponse.json({ error: 'Failed to get stickers' }, { status: 500 })
  }
}

// POST /api/pet/stickers - 新增貼紙（房間裝飾）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = stickerCreateSchema.parse(body)

    const pet = await getOrCreatePet(user.id)

    const canUseSticker = await hasStickerInventory(pet.id, payload.stickerId, user.id)
    if (!canUseSticker) {
      return NextResponse.json(
        { error: 'No available stickers. Please purchase this item first or check your inventory.' },
        { status: 400 }
      )
    }

    const sticker = await prisma.roomSticker.create({
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

    return NextResponse.json(sticker)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create sticker error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to create sticker', details: errorMessage },
      { status: 500 }
    )
  }
}

