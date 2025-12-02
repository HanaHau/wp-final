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

    const { missionId } = params
    const weekStart = getWeekStart()

    // 查找任務
    const mission = await prisma.mission.findFirst({
      where: {
        userId: userRecord.id,
        missionId,
        type: missionId.startsWith('record_5_days') || missionId.startsWith('interact_3_friends') ? 'weekly' : 'daily',
        weekStart: missionId.startsWith('record_5_days') || missionId.startsWith('interact_3_friends') ? weekStart : null,
      },
    })

    if (!mission) {
      return NextResponse.json({ error: '任務不存在' }, { status: 404 })
    }

    // 檢查任務是否完成
    if (!mission.completed) {
      return NextResponse.json({ error: '任務尚未完成' }, { status: 400 })
    }

    // 檢查是否已經領取過
    if (mission.claimed) {
      return NextResponse.json({ error: '獎勵已領取' }, { status: 400 })
    }

    // 計算點數
    const points = mission.type === 'daily'
      ? (mission.missionId === 'record_transaction' ? 10 : 5)
      : (mission.missionId === 'record_5_days' ? 40 : 30)

    // 更新任務為已領取
    await prisma.mission.update({
      where: { id: mission.id },
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
            increment: points,
          },
        },
      })
    }

    return NextResponse.json({ 
      message: '已領取點數', 
      points,
      mission: {
        ...mission,
        claimed: true,
      }
    })
  } catch (error) {
    console.error('Claim mission error:', error)
    return NextResponse.json({ error: '領取失敗' }, { status: 500 })
  }
}

