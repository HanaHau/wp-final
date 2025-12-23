import { NextResponse } from 'next/server'
import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 使用 revalidate 快取策略，30 秒內重用相同響應
export const revalidate = 30

export async function GET() {
  try {
    // 優化：直接使用 getCurrentUserRecord，避免兩次查詢
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    
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


