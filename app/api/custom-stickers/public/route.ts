import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// GET /api/custom-stickers/public - 取得所有公開的自訂貼紙
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const publicStickers = await prisma.customSticker.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(publicStickers)
  } catch (error) {
    console.error('Get public custom stickers error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to get public custom stickers', details: errorMessage },
      { status: 500 }
    )
  }
}

