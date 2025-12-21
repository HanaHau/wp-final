import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

export async function GET(request: NextRequest) {
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

    const count = await prisma.friend.count({
      where: {
        friendId: userRecord.id,
        status: 'PENDING',
      },
    })

    const response = NextResponse.json({ count })
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('Get invitation count error:', error)
    const response = NextResponse.json(
      { error: '取得邀請數量失敗' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}
