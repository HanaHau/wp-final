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

    // 查找任務定義
    const missionDef = await prisma.mission.findUnique({
      where: { code },
    })

    if (!missionDef) {
      console.log('任務定義不存在:', code)
      return NextResponse.json({ error: '任務定義不存在' }, { status: 404 })
    }

    console.log('任務定義:', { code: missionDef.code, title: missionDef.title, reward: missionDef.reward })

    // 查找用戶任務記錄
    const userMission = await prisma.missionUser.findUnique({
      where: {
        userId_missionId_periodStart: {
          userId: userRecord.id,
          missionId: missionDef.id,
          periodStart: periodStart,
        },
      },
    })

    if (!userMission) {
      console.log('任務記錄不存在')
      return NextResponse.json({ error: '任務不存在' }, { status: 404 })
    }

    console.log('任務記錄:', { 
      completed: userMission.completed, 
      claimed: userMission.claimed,
      progress: userMission.progress,
      target: missionDef.target
    })

    if (!userMission.completed) {
      console.log('任務尚未完成')
      return NextResponse.json({ error: '任務尚未完成' }, { status: 400 })
    }

    if (userMission.claimed) {
      console.log('獎勵已領取')
      return NextResponse.json({ error: '獎勵已領取' }, { status: 400 })
    }

    // 更新任務為已領取
    try {
      await prisma.missionUser.update({
        where: { id: userMission.id },
        data: {
          claimed: true,
        },
      })
      console.log('✅ 任務標記為已領取')
    } catch (updateError) {
      console.error('❌ 更新任務記錄失敗:', updateError)
      return NextResponse.json({ error: '更新任務記錄失敗' }, { status: 500 })
    }

    // 增加寵物點數
    try {
      const pet = await prisma.pet.findUnique({
        where: { userId: userRecord.id },
      })

      if (pet) {
        await prisma.pet.update({
          where: { userId: userRecord.id },
          data: {
            points: {
              increment: missionDef.reward,
            },
          },
        })
        console.log(`✅ 增加寵物點數: +${missionDef.reward} (總點數: ${pet.points + missionDef.reward})`)
      } else {
        console.warn('⚠️ 寵物不存在，無法增加點數')
        // 不返回錯誤，因為任務已經標記為已領取
      }
    } catch (petError) {
      console.error('❌ 更新寵物點數失敗:', petError)
      // 不返回錯誤，因為任務已經標記為已領取
    }

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

