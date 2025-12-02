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

    console.log('查詢已完成任務...')
    console.log('prisma 對象:', typeof prisma, 'mission 存在:', 'mission' in prisma)
    
    if (!('mission' in prisma)) {
      console.error('❌ prisma.mission 不存在！')
      throw new Error('Prisma Client 未正確初始化 mission 模型')
    }
    
    const completedMissions = await prisma.mission.findMany({
      where: {
        userId: userRecord.id,
        completed: true,
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { completedAt: 'desc' },
    })
    console.log('已完成任務數量:', completedMissions.length)

    const missions = completedMissions.map((m) => ({
      missionId: m.missionId,
      name: getMissionName(m.missionId),
      points: getMissionPoints(m.type, m.missionId),
      type: m.type,
    }))

    return NextResponse.json({ missions })
  } catch (error) {
    console.error('Get completed missions error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: '取得完成任務失敗' }, { status: 500 })
  }
}

function getMissionName(missionId: string): string {
  const names: Record<string, string> = {
    record_transaction: '今日記帳1筆',
    check_pet: '查看寵物狀態',
    edit_transaction: '整理帳目(任一編輯)',
    visit_friend: '拜訪1位好友',
    pet_friend: '摸摸好友寵物',
    record_5_days: '本週記帳達5天',
    interact_3_friends: '與3位好友互動',
  }
  return names[missionId] || missionId
}

function getMissionPoints(type: string, missionId: string): number {
  if (type === 'daily') {
    return missionId === 'record_transaction' ? 10 : 5
  } else {
    return missionId === 'record_5_days' ? 40 : 30
  }
}

