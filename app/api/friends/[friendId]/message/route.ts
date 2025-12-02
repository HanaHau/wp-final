import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Leave message for friend
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
    const { message, petId } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: '請輸入留言內容' }, { status: 400 })
    }

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

    // Get friend's pet if petId provided
    let finalPetId = petId
    if (!finalPetId) {
      const friendPet = await prisma.pet.findUnique({
        where: { userId: friendId },
        select: { id: true },
      })
      if (friendPet) {
        finalPetId = friendPet.id
      }
    }

    // Create message
    const friendMessage = await prisma.friendMessage.create({
      data: {
        senderId: userRecord.id,
        receiverId: friendId,
        petId: finalPetId || '',
        action: 'message',
        message: message.trim(),
      },
    })

    return NextResponse.json({
      message: '留言已送出',
      friendMessage,
    })
  } catch (error) {
    console.error('Leave message error:', error)
    return NextResponse.json(
      { error: '留言失敗' },
      { status: 500 }
    )
  }
}


