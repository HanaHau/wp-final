import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const purchaseSchema = z.object({
  itemName: z.string().min(1),
  cost: z.number().int().positive(),
})

// POST /api/pet/purchase - 寵物購買物品
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = purchaseSchema.parse(body)

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: '找不到寵物' }, { status: 404 })
    }

    if (pet.points < validatedData.cost) {
      return NextResponse.json(
        { error: '點數不足' },
        { status: 400 }
      )
    }

    // 扣除點數並記錄購買
    const [updatedPet, purchase] = await prisma.$transaction([
      prisma.pet.update({
        where: { id: pet.id },
        data: {
          points: {
            decrement: validatedData.cost,
          },
          mood: {
            increment: Math.min(5, Math.floor(validatedData.cost / 10)), // 購買增加心情
          },
        },
      }),
      prisma.petPurchase.create({
        data: {
          petId: pet.id,
          itemName: validatedData.itemName,
          cost: validatedData.cost,
        },
      }),
    ])

    return NextResponse.json({ pet: updatedPet, purchase }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('購買物品錯誤:', error)
    return NextResponse.json({ error: '購買物品失敗' }, { status: 500 })
  }
}

