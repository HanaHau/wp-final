import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const customStickerSchema = z.object({
  name: z.string().min(1).max(50),
  imageUrl: z.string().refine(
    (val) => val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'Image URL must be a valid data URL or HTTP(S) URL' }
  ),
  category: z.enum(['food', 'toy', 'decoration', 'accessory']),
  isPublic: z.boolean().default(false),
})

// GET /api/custom-stickers - 取得使用者的自訂貼紙
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customStickers = await prisma.customSticker.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(customStickers)
  } catch (error) {
    console.error('Get custom stickers error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to get custom stickers', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/custom-stickers - 建立自訂貼紙（花費 100 pts，自動購買一個）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = customStickerSchema.parse(body)

    // Get or create pet
    let pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      const now = new Date()
      pet = await prisma.pet.create({
        data: {
          userId: user.id,
          name: '我的寵物',
          points: 0,
          fullness: 70,
          mood: 70,
          lastLoginDate: now,
          lastDailyReset: now,
        },
      })
    }

    const COST = 100

    // Check if user has enough points
    if (pet.points < COST) {
      return NextResponse.json(
        { error: 'Not enough points. Custom stickers cost 100 points.' },
        { status: 400 }
      )
    }

    // Create custom sticker first
    const customSticker = await prisma.customSticker.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        imageUrl: validatedData.imageUrl,
        category: validatedData.category,
        isPublic: validatedData.isPublic,
      },
    })

    // Deduct points, create purchase record, and update pet in a transaction
    const [updatedPet, purchase] = await prisma.$transaction([
      prisma.pet.update({
        where: { id: pet.id },
        data: {
          points: { decrement: COST },
          mood: { increment: Math.min(5, Math.floor(COST / 10)) },
        },
      }),
      prisma.petPurchase.create({
        data: {
          petId: pet.id,
          itemId: `custom-${customSticker.id}`,
          itemName: validatedData.name,
          category: validatedData.category,
          cost: COST,
          quantity: 1,
        },
      }),
    ])

    return NextResponse.json(
      { customSticker, pet: updatedPet, purchase },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create custom sticker error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to create custom sticker', details: errorMessage },
      { status: 500 }
    )
  }
}

