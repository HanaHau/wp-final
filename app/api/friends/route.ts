import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 使用 revalidate 快取策略，60 秒內重用相同響應（僅對 GET 請求有效）
export const revalidate = 60

// Get friends list
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get friends where current user is either userId or friendId
    const friendships = await prisma.friend.findMany({
      where: {
        AND: [
          { status: 'accepted' },
          {
            OR: [
              { userId: userRecord.id },
              { friendId: userRecord.id },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userID: true,
            name: true,
            image: true,
          },
        },
        friend: {
          select: {
            id: true,
            email: true,
            userID: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Map to friend objects (the other user in the friendship)
    const friends = friendships.map((friendship) => {
      const friendUser = friendship.userId === userRecord.id
        ? friendship.friend
        : friendship.user
      return {
        id: friendUser.id,
        email: friendUser.email,
        userID: friendUser.userID,
        name: friendUser.name,
        image: friendUser.image,
        friendshipId: friendship.id,
      }
    })

    return NextResponse.json(friends)
  } catch (error) {
    console.error('Get friends error:', error)
    return NextResponse.json(
      { error: 'Failed to get friends list' },
      { status: 500 }
    )
  }
}

// Add friend
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { friendId } = body

    if (!friendId) {
      return NextResponse.json({ error: 'Please provide friend ID' }, { status: 400 })
    }

    if (friendId === userRecord.id) {
      return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 })
    }

    // Check if friend exists
    const friendUser = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true },
    })

    if (!friendUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already friends
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: userRecord.id, friendId: friendUser.id },
          { userId: friendUser.id, friendId: userRecord.id },
        ],
      },
    })

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 })
      }
      if (existingFriendship.status === 'PENDING') {
        if (existingFriendship.userId === userRecord.id) {
          return NextResponse.json({ error: 'Invitation sent, waiting for response' }, { status: 400 })
        } else {
          const updated = await prisma.friend.update({
            where: { id: existingFriendship.id },
            data: { status: 'accepted' },
          })
          return NextResponse.json({ message: 'Friend request accepted', friendship: updated })
        }
      }
    }

    // Create new friendship with PENDING status
    const friendship = await prisma.friend.create({
      data: {
        userId: userRecord.id,
        friendId: friendUser.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ message: 'Friend invitation sent', friendship })
  } catch (error) {
    console.error('Add friend error:', error)
    return NextResponse.json(
      { error: 'Failed to add friend' },
      { status: 500 }
    )
  }
}


