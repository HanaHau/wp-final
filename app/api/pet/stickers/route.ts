import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pet/stickers - 取得房間貼紙
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

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

// POST /api/pet/stickers - 新增貼紙（獎勵系統）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stickerId, positionX, positionY, rotation, scale, layer } = body

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    const sticker = await prisma.roomSticker.create({
      data: {
        petId: pet.id,
        stickerId: stickerId || 'rug',
        positionX: positionX ?? 0.5,
        positionY: positionY ?? 0.5,
        rotation: rotation ?? 0,
        scale: scale ?? 1,
        layer: layer || 'floor',
      },
    })

    return NextResponse.json(sticker)
  } catch (error) {
    console.error('Create sticker error:', error)
    return NextResponse.json({ error: 'Failed to create sticker' }, { status: 500 })
  }
}

