import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const invitationId = params.id

    const invitation = await prisma.friend.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      return NextResponse.json({ error: '邀請不存在' }, { status: 404 })
    }

    if (invitation.friendId !== userRecord.id) {
      return NextResponse.json({ error: '無權限' }, { status: 403 })
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: '邀請狀態不正確' }, { status: 400 })
    }

    await prisma.friend.delete({
      where: { id: invitationId },
    })

    return NextResponse.json({ message: '好友邀請已拒絕' })
  } catch (error) {
    console.error('Reject invitation error:', error)
    return NextResponse.json(
      { error: '拒絕邀請失敗' },
      { status: 500 }
    )
  }
}

