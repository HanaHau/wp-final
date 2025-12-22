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

    const { friendId } = params

    // 獲取用戶記錄
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    // 並行執行：檢查好友關係、獲取好友寵物數據和用戶信息（加速訪問）
    const [friendship, friendPet, friendUser] = await Promise.all([
      prisma.friend.findFirst({
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
      }),
      prisma.pet.findUnique({
        where: { userId: friendId },
        include: {
          stickers: true,
          accessories: true,
          purchases: {
            orderBy: { purchasedAt: 'desc' },
            take: 50,
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: friendId },
        select: {
          id: true,
          email: true,
          userID: true,
          name: true,
          image: true,
        },
      }),
    ])

    if (!friendship) {
      return NextResponse.json({ error: '不是好友關係' }, { status: 403 })
    }

    if (!friendPet) {
      return NextResponse.json({ error: '好友還沒有寵物' }, { status: 404 })
    }

    // 更新任務：拜訪好友
    const missionCompleted = await updateMissionProgress(userRecord.id, 'daily', 'visit_friend', 1)

    // Add warning flags for pet status
    const petWithStatus = {
      ...friendPet,
      imageUrl: friendPet.imageUrl || '/cat.png',
      isUnhappy: friendPet.mood < 30,
      isHungry: friendPet.fullness < 30,
      needsAttention: friendPet.mood < 50 || friendPet.fullness < 50,
      isSick: friendPet.mood <= 0 || friendPet.fullness <= 0,
    }

    return NextResponse.json({
      pet: petWithStatus,
      user: friendUser,
      missionCompleted: missionCompleted || undefined,
    })
  } catch (error) {
    console.error('Get friend pet error:', error)
    return NextResponse.json(
      { error: '取得好友寵物資訊失敗' },
      { status: 500 }
    )
  }
}


