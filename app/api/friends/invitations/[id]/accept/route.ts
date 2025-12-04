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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const invitationId = params.id

    const invitation = await prisma.friend.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.friendId !== userRecord.id) {
      return NextResponse.json({ error: 'No permission' }, { status: 403 })
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation status is incorrect' }, { status: 400 })
    }

    const updated = await prisma.friend.update({
      where: { id: invitationId },
      data: { status: 'accepted' },
    })

    return NextResponse.json({ message: 'Friend invitation accepted', friendship: updated })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

