import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Feed friend's pet
export async function POST(
  request: NextRequest,
  { params }: { params: { friendId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    const { friendId } = params
    const body = await request.json()
    const { itemId } = body

    // Check if they are friends
    const friendship = await prisma.friend.findFirst({
      where: {
        AND: [
          { status: 'accepted' },
          {
            OR: [
              { userId: userRecord.id, friendId },
              { userId: friendId, friendId: userRecord.id },
            ],
          },
        ],
      },
    })

    if (!friendship) {
      return NextResponse.json({ error: '不是好友關係' }, { status: 403 })
    }

    // Get friend's pet
    const friendPet = await prisma.pet.findUnique({
      where: { userId: friendId },
    })

    if (!friendPet) {
      return NextResponse.json({ error: '好友還沒有寵物' }, { status: 404 })
    }

    // Update pet fullness (limited increase for friend interactions)
    const fullnessGain = 5
    const newFullness = Math.min(100, friendPet.fullness + fullnessGain)
    await prisma.pet.update({
      where: { id: friendPet.id },
      data: { fullness: newFullness },
    })

    // Record the interaction
    await prisma.friendMessage.create({
      data: {
        senderId: userRecord.id,
        receiverId: friendId,
        petId: friendPet.id,
        action: 'feed',
      },
    })

    return NextResponse.json({
      message: '已餵食好友的寵物',
      fullnessGain,
    })
  } catch (error) {
    console.error('Feed friend pet error:', error)
    return NextResponse.json(
      { error: '餵食失敗' },
      { status: 500 }
    )
  }
}


