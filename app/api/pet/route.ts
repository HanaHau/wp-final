import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const petUpdateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  imageUrl: z.string().optional(),
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

    // Check daily interaction and update pet stats if needed
    const now = new Date()
    const lastUpdate = pet.updatedAt
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    
    // If more than 24 hours since last interaction, decrease stats
    if (hoursSinceUpdate > 24) {
      const daysSinceUpdate = Math.floor(hoursSinceUpdate / 24)
      const moodDecrease = Math.min(daysSinceUpdate * 5, pet.mood)
      const fullnessDecrease = Math.min(daysSinceUpdate * 5, pet.fullness)
      const healthDecrease = Math.min(daysSinceUpdate * 2, pet.health)
      
      if (moodDecrease > 0 || fullnessDecrease > 0 || healthDecrease > 0) {
        pet = await prisma.pet.update({
          where: { id: pet.id },
          data: {
            mood: Math.max(0, pet.mood - moodDecrease),
            fullness: Math.max(0, pet.fullness - fullnessDecrease),
            health: Math.max(0, pet.health - healthDecrease),
          },
          include: {
            purchases: true,
          },
        })
      }
    }

    // Add warning flags and ensure imageUrl has default value
    const petWithWarnings = {
      ...pet,
      imageUrl: pet.imageUrl || '/cat.png', // 如果為 null，使用預設圖片
      needsAttention: hoursSinceUpdate > 24,
      isSick: pet.health < 30,
      isUnhappy: pet.mood < 30,
      isHungry: pet.fullness < 30,
      daysSinceInteraction: Math.floor(hoursSinceUpdate / 24),
    }

    return NextResponse.json(petWithWarnings)
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

    // Only update fields that are provided
    const updateData: { name?: string; imageUrl?: string | null } = {}
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.imageUrl !== undefined) {
      updateData.imageUrl = validatedData.imageUrl || null
    }

    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: updateData,
    })

    console.log('寵物名稱更新成功:', { id: updatedPet.id, name: updatedPet.name })
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

