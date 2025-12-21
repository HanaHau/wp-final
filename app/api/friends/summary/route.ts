import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

// GET /api/friends/summary - 聚合 friends 頁面需要的所有資料
export async function GET(request: NextRequest) {
  try {
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addCorsHeaders(response, request)
    }

    // 並行獲取所有需要的資料
    const [friendships, invitations, activities] = await Promise.all([
      // 好友列表
      prisma.friend.findMany({
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
              name: true,
              email: true,
              image: true,
              userID: true,
            },
          },
          friend: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              userID: true,
            },
          },
        },
      }),

      // 邀請（pending）
      prisma.friend.findMany({
        where: {
          friendId: userRecord.id,
          status: 'pending',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              userID: true,
            },
          },
        },
      }),

      // 活動記錄（用於計算未讀數量）
      prisma.friendActivity.findMany({
        where: {
          targetId: userRecord.id,
          isRead: false,
        },
      }),
    ])

    // 處理好友列表
    const friends = friendships.map((friendship) => {
      const friend = friendship.userId === userRecord.id ? friendship.friend : friendship.user
      return {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        image: friend.image,
        userID: friend.userID,
        friendshipId: friendship.id,
        friendshipStatus: 'friend' as const,
      }
    })

    // 邀請數量
    const invitationCount = invitations.length

    // 未讀活動數量
    const unreadActivityCount = activities.length

    // 構建響應
    const summary = {
      friends,
      invitationCount,
      unreadActivityCount,
    }

    const response = NextResponse.json(summary)
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('取得 friends summary 錯誤:', error)
    const response = NextResponse.json(
      { error: 'Failed to get friends summary' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

