import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '請輸入搜尋關鍵字' }, { status: 400 })
    }

    const searchTerm = query.trim().toLowerCase()

    // Get current user record to get database ID
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    // Search by email or userID (SQLite doesn't support case-insensitive mode)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: searchTerm } },
              { userID: { contains: searchTerm } },
            ],
          },
          {
            id: { not: userRecord.id }, // Exclude current user
          },
        ],
      },
      select: {
        id: true,
        email: true,
        userID: true,
        name: true,
        image: true,
      },
      take: 10,
    })

    // Filter case-insensitively in JavaScript for SQLite
    const filteredUsers = users.filter((u) => {
      const emailMatch = u.email?.toLowerCase().includes(searchTerm)
      const userIDMatch = u.userID?.toLowerCase().includes(searchTerm)
      return emailMatch || userIDMatch
    })

    // Check friendship status for each user
    const usersWithStatus = await Promise.all(
      filteredUsers.map(async (user) => {
        const friendship = await prisma.friend.findFirst({
          where: {
            OR: [
              { userId: userRecord.id, friendId: user.id },
              { userId: user.id, friendId: userRecord.id },
            ],
          },
        })

        let status: 'none' | 'friend' | 'pending_sent' | 'pending_received' = 'none'
        if (friendship) {
          if (friendship.status === 'accepted') {
            status = 'friend'
          } else if (friendship.status === 'PENDING') {
            status = friendship.userId === userRecord.id ? 'pending_sent' : 'pending_received'
          }
        }

        return {
          ...user,
          friendshipStatus: status,
        }
      })
    )

    return NextResponse.json(usersWithStatus)
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json(
      { error: '搜尋失敗' },
      { status: 500 }
    )
  }
}

