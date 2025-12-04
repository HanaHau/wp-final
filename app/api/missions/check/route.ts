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

    const body = await request.json()
    const { missionCode, missionId, type } = body

    // 支持 missionId 和 missionCode（向後兼容）
    const code = missionCode || missionId

    if (!code || !type) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const periodStart = type === 'weekly' ? getWeekStart() : getDayStart()

    // 查找任務定義
    const missionDef = await prisma.mission.findUnique({
      where: { code },
    })

    if (!missionDef) {
      return NextResponse.json({ 
        completed: false, 
        message: '任務定義不存在' 
      }, { status: 404 })
    }

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
      return NextResponse.json({ 
        completed: false, 
        message: '任務尚未開始或未找到記錄' 
      })
    }

    // 檢查是否完成
    const isCompleted = userMission.progress >= missionDef.target

    if (isCompleted && !userMission.completed) {
      // 更新為已完成
      await prisma.missionUser.update({
        where: { id: userMission.id },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      completed: isCompleted,
      progress: userMission.progress,
      target: missionDef.target,
      message: isCompleted 
        ? '任務已完成！可以領取獎勵了' 
        : `進度：${userMission.progress}/${missionDef.target}`,
    })
  } catch (error) {
    console.error('Check mission error:', error)
    return NextResponse.json({ error: '檢查任務失敗' }, { status: 500 })
  }
}

