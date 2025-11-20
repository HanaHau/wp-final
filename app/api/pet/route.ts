import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const petUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
})

// GET /api/pet - 取得寵物資訊
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    let pet = await prisma.pet.findUnique({
      where: { userId: user.id },
      include: {
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 10,
        },
      },
    })

    // 如果沒有寵物，建立一隻預設寵物
    if (!pet) {
      pet = await prisma.pet.create({
        data: {
          userId: user.id,
          name: '我的寵物',
          points: 0,
          fullness: 50,
          mood: 50,
          health: 100,
        },
        include: {
          purchases: true,
        },
      })
    }

    return NextResponse.json(pet)
  } catch (error) {
    console.error('取得寵物資訊錯誤:', error)
    return NextResponse.json({ error: '取得寵物資訊失敗' }, { status: 500 })
  }
}

// PUT /api/pet - 更新寵物資訊
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = petUpdateSchema.parse(body)

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: '找不到寵物' }, { status: 404 })
    }

    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: validatedData,
    })

    return NextResponse.json(updatedPet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新寵物資訊錯誤:', error)
    return NextResponse.json({ error: '更新寵物資訊失敗' }, { status: 500 })
  }
}

