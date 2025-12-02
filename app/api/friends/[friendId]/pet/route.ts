import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateMissionProgress } from '@/lib/missions'

// Pet friend's pet
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

    // Update pet mood (limited increase for friend interactions)
    const newMood = Math.min(100, friendPet.mood + 1)
    await prisma.pet.update({
      where: { id: friendPet.id },
      data: { mood: newMood },
    })

    await prisma.friendMessage.create({
      data: {
        senderId: userRecord.id,
        receiverId: friendId,
        petId: friendPet.id,
        action: 'pet',
      },
    })

    // 更新任務進度
    await updateMissionProgress(userRecord.id, 'daily', 'pet_friend', 1)
    
    // 更新每週任務：與3位好友互動
    const interactions = await prisma.friendMessage.findMany({
      where: {
        senderId: userRecord.id,
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
      distinct: ['receiverId'],
    })
    
    await updateMissionProgress(userRecord.id, 'weekly', 'interact_3_friends', interactions.length)

    return NextResponse.json({
      message: '已撫摸好友的寵物',
      moodGain: 1,
    })
  } catch (error) {
    console.error('Pet friend pet error:', error)
    return NextResponse.json(
      { error: '撫摸失敗' },
      { status: 500 }
    )
  }
}


