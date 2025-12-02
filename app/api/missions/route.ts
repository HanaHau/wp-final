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

export async function GET() {
  try {
    console.log('=== GET /api/missions 開始 ===')
    const user = await getCurrentUser()
    console.log('User from getCurrentUser:', user ? { email: user.email, id: user.id } : 'null')
    
    if (!user || !user.email) {
      console.log('未授權：沒有用戶或 email')
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })
    console.log('User record from DB:', userRecord)

    if (!userRecord) {
      console.log('使用者不存在')
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = getWeekStart()
    console.log('Week start:', weekStart.toISOString())

    const dailyMissions = [
      { id: 'record_transaction', name: '今日記帳1筆', points: 10, target: 1 },
      { id: 'check_pet', name: '查看寵物狀態', points: 5, target: 1 },
      { id: 'edit_transaction', name: '整理帳目(任一編輯)', points: 5, target: 1 },
      { id: 'visit_friend', name: '拜訪1位好友', points: 5, target: 1 },
      { id: 'pet_friend', name: '摸摸好友寵物', points: 5, target: 1 },
    ]

    const weeklyMissions = [
      { id: 'record_5_days', name: '本週記帳達5天', points: 40, target: 5 },
      { id: 'interact_3_friends', name: '與3位好友互動', points: 30, target: 3 },
    ]

    console.log('查詢資料庫中的任務...')
    console.log('prisma 對象:', typeof prisma, 'mission 存在:', 'mission' in prisma)
    
    if (!('mission' in prisma)) {
      console.error('❌ prisma.mission 不存在！')
      throw new Error('Prisma Client 未正確初始化 mission 模型')
    }
    
    const allMissions = await prisma.mission.findMany({
      where: {
        userId: userRecord.id,
      },
    })
    console.log('從資料庫取得的任務數量:', allMissions.length)
    
    const existingMissions = allMissions.filter((m) => {
      if (m.type === 'daily') return true
      if (m.type === 'weekly' && m.weekStart) {
        const existingWeekStart = new Date(m.weekStart)
        existingWeekStart.setHours(0, 0, 0, 0)
        const currentWeekStart = new Date(weekStart)
        currentWeekStart.setHours(0, 0, 0, 0)
        return existingWeekStart.getTime() === currentWeekStart.getTime()
      }
      return false
    })

    const missions: any[] = []

    for (const mission of dailyMissions) {
      const existing = existingMissions.find(
        (m) => m.type === 'daily' && m.missionId === mission.id
      )
      missions.push({
        type: 'daily',
        missionId: mission.id,
        name: mission.name,
        points: mission.points,
        progress: existing?.progress || 0,
        target: mission.target,
        completed: existing?.completed || false,
        claimed: existing?.claimed || false,
        claimed: existing?.claimed || false,
      })
    }

    for (const mission of weeklyMissions) {
      const existing = existingMissions.find(
        (m) => {
          if (m.type !== 'weekly' || m.missionId !== mission.id) return false
          if (!m.weekStart) return false
          const existingWeekStart = new Date(m.weekStart)
          existingWeekStart.setHours(0, 0, 0, 0)
          const currentWeekStart = new Date(weekStart)
          currentWeekStart.setHours(0, 0, 0, 0)
          return existingWeekStart.getTime() === currentWeekStart.getTime()
        }
      )
      missions.push({
        type: 'weekly',
        missionId: mission.id,
        name: mission.name,
        points: mission.points,
        progress: existing?.progress || 0,
        target: mission.target,
        completed: existing?.completed || false,
        claimed: existing?.claimed || false,
        weekStart: weekStart.toISOString(),
      })
    }

    console.log('返回任務數據:', { missionsCount: missions.length, missions })
    return NextResponse.json(missions) // 直接返回數組，不是對象
  } catch (error) {
    console.error('Get missions error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: '取得任務失敗' }, { status: 500 })
  }
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
    const { type, missionId, progress = 1 } = body

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = getWeekStart()

    if (type === 'weekly' && missionId === 'record_5_days') {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userRecord.id,
          date: {
            gte: weekStart,
          },
        },
        select: { date: true },
      })

      const uniqueDays = new Set(
        transactions.map((t) => {
          const d = new Date(t.date)
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        })
      ).size

      const whereClause: any = {
        userId: userRecord.id,
        type: 'weekly',
        missionId: 'record_5_days',
        weekStart: weekStart,
      }

      const existing = await prisma.mission.findFirst({
        where: whereClause,
      })

      let mission
      if (existing) {
        mission = await prisma.mission.update({
          where: { id: existing.id },
          data: {
            progress: uniqueDays,
            updatedAt: new Date(),
          },
        })
      } else {
        mission = await prisma.mission.create({
          data: {
            userId: userRecord.id,
            type: 'weekly',
            missionId: 'record_5_days',
            progress: uniqueDays,
            target: 5,
            weekStart: weekStart,
          },
        })
      }

      const isCompleted = mission.progress >= mission.target && !mission.completed

      if (isCompleted) {
        await prisma.mission.update({
          where: { id: mission.id },
          data: {
            completed: true,
            completedAt: new Date(),
          },
        })

        const pet = await prisma.pet.findUnique({
          where: { userId: userRecord.id },
          select: { points: true },
        })

        if (pet) {
          await prisma.pet.update({
            where: { userId: userRecord.id },
            data: {
              points: {
                increment: 40,
              },
            },
          })
        }
      }

      return NextResponse.json({ mission, completed: isCompleted })
    }

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

    const existing = await prisma.mission.findFirst({
      where: whereClause,
    })

    let mission
    if (existing) {
      const newProgress = existing.progress + progress
      const isCompleted = newProgress >= existing.target
      
      mission = await prisma.mission.update({
        where: { id: existing.id },
        data: {
          progress: newProgress,
          completed: isCompleted || existing.completed,
          completedAt: isCompleted && !existing.completed ? new Date() : existing.completedAt,
          updatedAt: new Date(),
        },
      })
    } else {
      const target = type === 'daily' ? 1 : (missionId === 'record_5_days' ? 5 : 3)
      const isCompleted = progress >= target
      
      mission = await prisma.mission.create({
        data: {
          userId: userRecord.id,
          type,
          missionId,
          progress,
          target,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
          weekStart: type === 'weekly' ? weekStart : null,
        },
      })
    }

    const isCompleted = mission.progress >= mission.target && mission.completed

    return NextResponse.json({ 
      mission, 
      completed: isCompleted,
      progress: mission.progress,
      target: mission.target,
    })
  } catch (error) {
    console.error('Update mission error:', error)
    return NextResponse.json({ error: '更新任務失敗' }, { status: 500 })
  }
}

