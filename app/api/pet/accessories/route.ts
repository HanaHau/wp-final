import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

const accessoryCreateSchema = z.object({
  accessoryId: z.string().min(1),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  rotation: z.number().optional(),
  scale: z.number().optional(),
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

async function hasAccessoryInventory(petId: string, accessoryId: string, userId: string) {
  // Custom accessories (starting with "custom-")
  if (accessoryId.startsWith('custom-')) {
    const customAccessoryId = accessoryId.replace('custom-', '')
    const customAccessory = await prisma.customSticker.findUnique({
      where: { id: customAccessoryId },
    })
    
    if (!customAccessory || customAccessory.category !== 'accessory') return false
    
    // Check if user has purchased this custom accessory
    const purchase = await prisma.petPurchase.findFirst({
      where: {
        petId,
        itemId: `custom-${customAccessoryId}`,
      },
    })
    
    if (!purchase) return false
    
    // Count how many are already placed
    const placedCount = await prisma.petAccessory.count({
      where: {
        petId,
        accessoryId: `custom-${customAccessoryId}`,
      },
    })
    
    return purchase.quantity > placedCount
  }
  
  // Regular shop accessories
  const purchase = await prisma.petPurchase.findFirst({
    where: {
      petId,
      itemId: accessoryId,
      category: 'accessory',
    },
  })
  
  if (!purchase) return false
  
  // Count how many are already placed
  const placedCount = await prisma.petAccessory.count({
    where: {
      petId,
      accessoryId,
    },
  })
  
  return purchase.quantity > placedCount
}

// GET /api/pet/accessories - Get pet accessories
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

    const accessories = await prisma.petAccessory.findMany({
      where: { petId: pet.id },
      orderBy: { createdAt: 'asc' },
    })

    // Enrich accessories with imageUrl for custom accessories
    // For regular shop accessories, they don't have imageUrl, so they'll use emoji from SHOP_ITEM_MAP
    const enrichedAccessories = await Promise.all(
      accessories.map(async (accessory) => {
        if (accessory.accessoryId.startsWith('custom-')) {
          const customAccessoryId = accessory.accessoryId.replace('custom-', '')
          const customAccessory = await prisma.customSticker.findUnique({
            where: { id: customAccessoryId },
            select: { imageUrl: true },
          })
          return {
            ...accessory,
            imageUrl: customAccessory?.imageUrl || null,
          }
        }
        // Regular shop accessories - no imageUrl, will use emoji from SHOP_ITEM_MAP in frontend
        return {
          ...accessory,
          imageUrl: null, // Explicitly set to null so frontend knows to use emoji lookup
        }
      })
    )

    return NextResponse.json(enrichedAccessories)
  } catch (error) {
    console.error('Get accessories error:', error)
    return NextResponse.json({ error: 'Failed to get accessories' }, { status: 500 })
  }
}

// POST /api/pet/accessories - Add accessory to pet
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
    const payload = accessoryCreateSchema.parse(body)

    const pet = await getOrCreatePet(userRecord.id)

    // Use a transaction to atomically check inventory and create accessory
    const result = await prisma.$transaction(async (tx) => {
      // Check inventory within transaction
      const canUseAccessory = await hasAccessoryInventoryInTx(tx, pet.id, payload.accessoryId, userRecord.id)
      if (!canUseAccessory) {
        throw new Error('No available accessories. Please purchase this item first or check your inventory.')
      }

      // Create accessory
      const accessory = await tx.petAccessory.create({
        data: {
          petId: pet.id,
          accessoryId: payload.accessoryId,
          positionX: payload.positionX,
          positionY: payload.positionY,
          rotation: payload.rotation ?? 0,
          scale: payload.scale ?? 1,
        },
      })

      return accessory
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create accessory error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const statusCode = errorMessage.includes('No available accessories') ? 400 : 500
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Transaction-safe version of hasAccessoryInventory
async function hasAccessoryInventoryInTx(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  petId: string,
  accessoryId: string,
  userId: string
) {
  // Custom accessories (starting with "custom-")
  if (accessoryId.startsWith('custom-')) {
    const customAccessoryId = accessoryId.replace('custom-', '')
    const customAccessory = await tx.customSticker.findUnique({
      where: { id: customAccessoryId },
    })
    
    if (!customAccessory || customAccessory.category !== 'accessory') return false
    
    // Check if user has purchased this custom accessory
    const purchase = await tx.petPurchase.findFirst({
      where: {
        petId,
        itemId: `custom-${customAccessoryId}`,
      },
    })
    
    if (!purchase) return false
    
    // Count how many are already placed
    const placedCount = await tx.petAccessory.count({
      where: {
        petId,
        accessoryId: `custom-${customAccessoryId}`,
      },
    })
    
    return purchase.quantity > placedCount
  }
  
  // Regular shop accessories
  const purchase = await tx.petPurchase.findFirst({
    where: {
      petId,
      itemId: accessoryId,
      category: 'accessory',
    },
  })
  
  if (!purchase) return false
  
  // Count how many are already placed
  const placedCount = await tx.petAccessory.count({
    where: {
      petId,
      accessoryId,
    },
  })
  
  return purchase.quantity > placedCount
}

