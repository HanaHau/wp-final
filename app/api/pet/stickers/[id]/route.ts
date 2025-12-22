import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const stickerUpdateSchema = z.object({
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  scale: z.number().optional(),
  layer: z.enum(['floor', 'wall-left', 'wall-right']).optional(),
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

// PATCH /api/pet/stickers/[id] - 更新貼紙（位置、旋轉、縮放等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Parse and validate update data first
    const body = await request.json()
    const updateData = stickerUpdateSchema.parse(body)

    // Build update object with only provided fields
    const updateFields: {
      positionX?: number
      positionY?: number
      rotation?: number
      scale?: number
      layer?: 'floor' | 'wall-left' | 'wall-right'
    } = {}

    if (updateData.positionX !== undefined) updateFields.positionX = updateData.positionX
    if (updateData.positionY !== undefined) updateFields.positionY = updateData.positionY
    if (updateData.rotation !== undefined) updateFields.rotation = updateData.rotation
    if (updateData.scale !== undefined) updateFields.scale = updateData.scale
    if (updateData.layer !== undefined) updateFields.layer = updateData.layer

    // 優化：在更新時同時驗證 petId，減少查詢次數
    const updatedSticker = await prisma.roomSticker.updateMany({
      where: {
        id: params.id,
        petId: pet.id, // 同時驗證所有權
      },
      data: updateFields,
    })

    if (updatedSticker.count === 0) {
      return NextResponse.json({ error: 'Sticker not found' }, { status: 404 })
    }

    // 返回更新後的貼紙（只查詢一次）
    const sticker = await prisma.roomSticker.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json(sticker)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update sticker error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to update sticker', details: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE /api/pet/stickers/[id] - 移除貼紙（返回庫存）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pet = await getOrCreatePet(user.id)

    // Find the sticker and verify it belongs to the user's pet
    const sticker = await prisma.roomSticker.findUnique({
      where: { id: params.id },
    })

    if (!sticker || sticker.petId !== pet.id) {
      return NextResponse.json({ error: 'Sticker not found' }, { status: 404 })
    }

    // Delete the sticker
    await prisma.roomSticker.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, stickerId: sticker.stickerId })
  } catch (error) {
    console.error('Delete sticker error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to delete sticker', details: errorMessage },
      { status: 500 }
    )
  }
}

