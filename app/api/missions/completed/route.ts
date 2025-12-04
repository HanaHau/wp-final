import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('=== GET /api/missions/completed 開始 ===')
    const user = await getCurrentUser()
    if (!user || !user.email) {
      console.log('未授權：沒有用戶或 email')
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      console.log('使用者不存在')
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    console.log('查詢已完成但未領取的任務...')
    
    const completedMissions = await prisma.missionUser.findMany({
      where: {
        userId: userRecord.id,
        completed: true,
        claimed: false, // Only return unclaimed missions
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        mission: true,
      },
      orderBy: { completedAt: 'desc' },
    })
    console.log('已完成但未領取的任務數量:', completedMissions.length)

    const missions = completedMissions.map((m) => ({
      missionId: m.mission.code, // 保持向後兼容
      missionCode: m.mission.code,
      name: m.mission.title,
      points: m.mission.reward,
      type: m.mission.type,
    }))

    return NextResponse.json({ missions })
  } catch (error) {
    console.error('Get completed missions error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: '取得完成任務失敗' }, { status: 500 })
  }
}


