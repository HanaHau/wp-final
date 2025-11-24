import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

