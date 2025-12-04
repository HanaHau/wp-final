import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/friend-activities - 獲取好友活動記錄
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    // 獲取所有針對該用戶的活動記錄（過去7天）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const activities = await prisma.friendActivity.findMany({
      where: {
        targetId: userRecord.id,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            userID: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // 最多返回50條記錄
    })

    // 計算未讀數量
    const unreadCount = activities.filter(a => !a.isRead).length

    return NextResponse.json({ activities, unreadCount })
  } catch (error) {
    console.error('Get friend activities error:', error)
    return NextResponse.json({ error: '獲取活動記錄失敗' }, { status: 500 })
  }
}

// POST /api/friend-activities - 標記活動為已讀
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    const { activityIds, markAllAsRead } = await request.json()

    if (markAllAsRead) {
      // 標記所有未讀活動為已讀
      await prisma.friendActivity.updateMany({
        where: {
          targetId: userRecord.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })
    } else if (activityIds && Array.isArray(activityIds)) {
      // 標記特定活動為已讀
      await prisma.friendActivity.updateMany({
        where: {
          id: { in: activityIds },
          targetId: userRecord.id,
        },
        data: {
          isRead: true,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark activities as read error:', error)
    return NextResponse.json({ error: '標記已讀失敗' }, { status: 500 })
  }
}

