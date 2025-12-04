import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    const invitations = await prisma.friend.findMany({
      where: {
        friendId: userRecord.id,
        status: 'PENDING',
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: 'Failed to get invitations list' },
      { status: 500 }
    )
  }
}

