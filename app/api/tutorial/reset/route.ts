import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset user's tutorial completion status
    await prisma.user.update({
      where: { email: session.user.email },
      data: { hasCompletedTutorial: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reset tutorial:', error)
    return NextResponse.json(
      { error: 'Failed to reset tutorial' },
      { status: 500 }
    )
  }
}

