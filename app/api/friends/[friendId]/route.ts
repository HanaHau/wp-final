import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateMissionProgress } from '@/lib/missions'

// Get friend's pet and room data
export async function GET(
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

    // Get friend's pet data
    const friendPet = await prisma.pet.findUnique({
      where: { userId: friendId },
      include: {
        stickers: true,
        accessories: true,
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!friendPet) {
      return NextResponse.json({ error: '好友還沒有寵物' }, { status: 404 })
    }

    // Get friend user info
    const friendUser = await prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        email: true,
        userID: true,
        name: true,
        image: true,
      },
    })

    // 更新任務：拜訪好友
    await updateMissionProgress(userRecord.id, 'daily', 'visit_friend', 1)

    return NextResponse.json({
      pet: friendPet,
      user: friendUser,
    })
  } catch (error) {
    console.error('Get friend pet error:', error)
    return NextResponse.json(
      { error: '取得好友寵物資訊失敗' },
      { status: 500 }
    )
  }
}


