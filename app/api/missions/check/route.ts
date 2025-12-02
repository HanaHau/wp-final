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
    const { missionId, type } = body

    if (!missionId || !type) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const weekStart = type === 'weekly' ? getWeekStart() : null

    // 查找任務記錄
    const whereClause: any = {
      userId: userRecord.id,
      type,
      missionId,
    }

    if (type === 'weekly') {
      whereClause.weekStart = weekStart
    } else {
      whereClause.weekStart = null
    }

    const mission = await prisma.mission.findFirst({
      where: whereClause,
    })

    if (!mission) {
      return NextResponse.json({ 
        completed: false, 
        message: '任務尚未開始或未找到記錄' 
      })
    }

    // 檢查是否完成
    const isCompleted = mission.progress >= mission.target

    if (isCompleted && !mission.completed) {
      // 更新為已完成
      await prisma.mission.update({
        where: { id: mission.id },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      completed: isCompleted,
      progress: mission.progress,
      target: mission.target,
      message: isCompleted 
        ? '任務已完成！可以領取獎勵了' 
        : `進度：${mission.progress}/${mission.target}`,
    })
  } catch (error) {
    console.error('Check mission error:', error)
    return NextResponse.json({ error: '檢查任務失敗' }, { status: 500 })
  }
}

