import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

const getDayStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST(request: Request) {
  try {
    console.log('=== POST /api/missions/claim 開始 ===')
    
    const user = await getCurrentUser()
    if (!user || !user.email) {
      console.log('未授權：沒有用戶或 email')
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    console.log('用戶:', user.email)

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      console.log('使用者不存在')
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { missionCode, missionId, type } = body
    console.log('請求參數:', { missionCode, missionId, type })

    // 支持 missionId 和 missionCode（向後兼容）
    const code = missionCode || missionId

    if (!code || !type) {
      console.log('缺少必要參數')
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const periodStart = type === 'weekly' ? getWeekStart() : getDayStart()
    console.log('Period start:', periodStart.toISOString())

    // 使用事務一次性完成所有操作，確保一致性並減少查詢次數
    const result = await prisma.$transaction(async (tx) => {
    // 查找任務定義
      const missionDef = await tx.mission.findUnique({
      where: { code },
    })

    if (!missionDef) {
        throw new Error('任務定義不存在')
    }

    console.log('任務定義:', { code: missionDef.code, title: missionDef.title, reward: missionDef.reward })

    // 查找用戶任務記錄
      const userMission = await tx.missionUser.findUnique({
      where: {
        userId_missionId_periodStart: {
          userId: userRecord.id,
          missionId: missionDef.id,
          periodStart: periodStart,
        },
      },
    })

    if (!userMission) {
        throw new Error('任務記錄不存在')
    }

    console.log('任務記錄:', { 
      completed: userMission.completed, 
      claimed: userMission.claimed,
      progress: userMission.progress,
      target: missionDef.target
    })

    if (!userMission.completed) {
        throw new Error('任務尚未完成')
    }

    if (userMission.claimed) {
        throw new Error('獎勵已領取')
    }

      // 同時更新任務狀態和寵物點數
      const [updatedMission, pet] = await Promise.all([
    // 更新任務為已領取
        tx.missionUser.update({
        where: { id: userMission.id },
          data: { claimed: true },
        }),
        // 查找寵物（用於更新點數）
        tx.pet.findUnique({
        where: { userId: userRecord.id },
          select: { id: true, points: true },
        }),
      ])

      // 如果寵物存在，更新點數
      if (pet) {
        await tx.pet.update({
          where: { id: pet.id },
          data: {
            points: {
              increment: missionDef.reward,
            },
          },
        })
        console.log(`✅ 增加寵物點數: +${missionDef.reward} (總點數: ${pet.points + missionDef.reward})`)
      } else {
        console.warn('⚠️ 寵物不存在，無法增加點數')
      }

      return { missionDef, updatedMission }
    }).catch((error) => {
      console.error('❌ 領取任務失敗:', error)
      throw error
    })

    const { missionDef } = result

    return NextResponse.json({ 
      message: '已領取點數', 
      points: missionDef.reward,
    })
  } catch (error) {
    console.error('❌ Claim mission error:', error)
    console.error('錯誤詳情:', error instanceof Error ? error.message : String(error))
    console.error('錯誤堆疊:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: '領取失敗',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
    }, { status: 500 })
  }
}

