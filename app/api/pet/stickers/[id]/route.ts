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

    // Parse and validate update data
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

    // Update the sticker
    const updatedSticker = await prisma.roomSticker.update({
      where: { id: params.id },
      data: updateFields,
    })

    return NextResponse.json(updatedSticker)
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

