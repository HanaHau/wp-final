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

export async function POST(
  request: Request,
  { params }: { params: { missionId: string } }
) {
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

    const { missionId: missionCode } = params

    // 查找任務定義
    const missionDef = await prisma.mission.findUnique({
      where: { code: missionCode },
    })

    if (!missionDef) {
      return NextResponse.json({ error: '任務定義不存在' }, { status: 404 })
    }

    const periodStart = missionDef.type === 'weekly' ? getWeekStart() : getDayStart()

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
      return NextResponse.json({ error: '任務不存在' }, { status: 404 })
    }

    // 檢查任務是否完成
    if (!userMission.completed) {
      return NextResponse.json({ error: '任務尚未完成' }, { status: 400 })
    }

    // 檢查是否已經領取過
    if (userMission.claimed) {
      return NextResponse.json({ error: '獎勵已領取' }, { status: 400 })
    }

    // 更新任務為已領取
    const updatedMission = await prisma.missionUser.update({
      where: { id: userMission.id },
      data: { claimed: true },
    })

    // 增加寵物點數
    const pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
    })

    if (pet) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          points: {
            increment: missionDef.reward,
          },
        },
      })
    }

    return NextResponse.json({ 
      message: '已領取點數', 
      points: missionDef.reward,
      mission: {
        ...updatedMission,
        missionCode: missionDef.code,
        name: missionDef.title,
        points: missionDef.reward,
        target: missionDef.target,
        type: missionDef.type,
      }
    })
  } catch (error) {
    console.error('Claim mission error:', error)
    return NextResponse.json({ error: '領取失敗' }, { status: 500 })
  }
}

