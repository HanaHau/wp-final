import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

const feedSchema = z.object({
  itemId: z.string().min(1),
})

// POST /api/pet/feed - 餵食寵物
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = feedSchema.parse(body)

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Check if it's a custom sticker or regular shop item
    let itemCost: number
    let itemCategory: string
    
    if (validatedData.itemId.startsWith('custom-')) {
      // Custom sticker - get from database
      const customStickerId = validatedData.itemId.replace('custom-', '')
      const customSticker = await prisma.customSticker.findUnique({
        where: { id: customStickerId },
      })
      
      if (!customSticker || customSticker.category !== 'food') {
        return NextResponse.json({ error: 'Invalid food item' }, { status: 400 })
      }
      
      itemCost = customSticker.price
      itemCategory = customSticker.category
    } else {
      // Regular shop item
      const item = SHOP_ITEM_MAP[validatedData.itemId]
      if (!item || item.category !== 'food') {
        return NextResponse.json({ error: 'Invalid food item' }, { status: 400 })
      }
      itemCost = item.cost
      itemCategory = item.category
    }

    // Check if user has this food item
    const purchase = await prisma.petPurchase.findFirst({
      where: {
        petId: pet.id,
        itemId: validatedData.itemId,
        category: 'food',
        quantity: { gt: 0 },
      },
      orderBy: { purchasedAt: 'asc' }, // Use oldest first
    })

    if (!purchase) {
      return NextResponse.json({ error: 'No food available' }, { status: 400 })
    }

    // Use transaction to consume food and update pet stats
    const result = await prisma.$transaction(async (tx) => {
      // Decrease food quantity
      const updatedPurchase = await tx.petPurchase.update({
        where: { id: purchase.id },
        data: {
          quantity: {
            decrement: 1,
          },
        },
      })

      // If quantity reaches 0, we could delete it, but keeping it for history
      // Delete if quantity is 0 or less
      if (updatedPurchase.quantity <= 0) {
        await tx.petPurchase.delete({
          where: { id: purchase.id },
        })
      }

      // Update pet stats: fullness 增加量為食物的 cost/price 數
      const fullnessIncrease = itemCost
      const updatedPet = await tx.pet.update({
        where: { id: pet.id },
        data: {
          fullness: Math.min(100, pet.fullness + fullnessIncrease),
        },
      })

      return { pet: updatedPet, fullnessGain: fullnessIncrease }
    })

    // Generate pet message based on mood
    const messages = [
      'Yummy! Thanks! 🐾',
      'That was delicious! 😸',
      'I feel better now! 💕',
      'More please! 🍽️',
      'I love this! ❤️',
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]

    return NextResponse.json({
      pet: result.pet,
      message: randomMessage,
      fullnessGain: result.fullnessGain,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Feed pet error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to feed pet', details: errorMessage },
      { status: 500 }
    )
  }
}

