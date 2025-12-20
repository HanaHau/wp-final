import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/shop-data - 合併所有 shop 需要的資料（不修改 schema）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 並行執行所有查詢以提高性能
    const [pet, customStickers, publicStickers] = await Promise.all([
      // 1. 獲取寵物資訊（只需要 points）
      (async () => {
        const pet = await prisma.pet.findUnique({
          where: { userId: userRecord.id },
          select: {
            id: true,
            points: true,
          },
        })

        if (!pet) {
          const newPet = await prisma.pet.create({
            data: {
              userId: userRecord.id,
              name: 'My Pet',
              points: 50,
              fullness: 70,
              mood: 70,
              lastLoginDate: new Date(),
              lastDailyReset: new Date(),
            },
            select: {
              id: true,
              points: true,
            },
          })
          return {
            id: newPet.id,
            points: newPet.points,
          }
        }

        return {
          id: pet.id,
          points: pet.points,
        }
      })(),
      // 2. 獲取自定義貼紙
      prisma.customSticker.findMany({
        where: {
          userId: userRecord.id,
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          category: true,
          price: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 3. 獲取公開貼紙
      prisma.customSticker.findMany({
        where: {
          isPublic: true,
          NOT: {
            userId: userRecord.id,
          },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          category: true,
          price: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      pet,
      customStickers,
      publicStickers,
    })
  } catch (error) {
    console.error('Shop data API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch shop data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
