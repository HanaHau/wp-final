import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateMissionProgress } from '@/lib/missions'

// Helper function to get week start (Monday 00:00)
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

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

    // 更新每週任務：與3位好友互動（只計算不同的好友）
    // 在創建記錄之前檢查
    const weekStart = getWeekStart()
    
    // 查詢本週已經互動過的不同好友（包括 pet, feed 兩種互動）
    const interactedFriends = await prisma.friendMessage.findMany({
      where: {
        senderId: userRecord.id,
        createdAt: {
          gte: weekStart,
        },
      },
      select: {
        receiverId: true,
      },
    })
    
    // 獲取不同的好友 ID 集合
    const distinctFriendIds = new Set(interactedFriends.map(msg => msg.receiverId))
    
    // 檢查當前互動的好友是否已經在本週互動過
    const isNewFriendInteraction = !distinctFriendIds.has(friendId)

    await prisma.friendMessage.create({
      data: {
        senderId: userRecord.id,
        receiverId: friendId,
        petId: friendPet.id,
        action: 'pet',
      },
    })

    // 更新任務進度
    const dailyMissionCompleted = await updateMissionProgress(userRecord.id, 'daily', 'pet_friend', 1)
    
    // 如果是新的好友互動，更新每週任務進度
    let weeklyMissionCompleted = null
    if (isNewFriendInteraction) {
      weeklyMissionCompleted = await updateMissionProgress(userRecord.id, 'weekly', 'interact_3_friends', 1)
    }

    // 優先返回每日任務完成信息（如果有的話），否則返回每週任務完成信息
    const missionCompleted = dailyMissionCompleted || weeklyMissionCompleted

    return NextResponse.json({
      message: '已撫摸好友的寵物',
      moodGain: 1,
      missionCompleted: missionCompleted || undefined,
    })
  } catch (error) {
    console.error('Pet friend pet error:', error)
    return NextResponse.json(
      { error: '撫摸失敗' },
      { status: 500 }
    )
  }
}


