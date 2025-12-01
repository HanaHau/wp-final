import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/pet/visit - 記錄訪問 pet page（每天限一次，+5 points）
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: '找不到寵物' }, { status: 404 })
    }

    // 檢查是否為當天第一次訪問 pet page
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastPetPageVisit = pet.lastPetPageVisit ? new Date(pet.lastPetPageVisit) : null
    const isFirstPetPageVisitToday = !lastPetPageVisit || lastPetPageVisit < today

    if (isFirstPetPageVisitToday) {
      // 如果是當天第一次訪問，points +5
      const updatedPet = await prisma.pet.update({
        where: { id: pet.id },
        data: {
          points: {
            increment: 5,
          },
          lastPetPageVisit: now,
        },
      })

      return NextResponse.json({
        success: true,
        pointsGained: 5,
        totalPoints: updatedPet.points,
      })
    } else {
      // 今天已經訪問過，不增加 points
      return NextResponse.json({
        success: true,
        pointsGained: 0,
        totalPoints: pet.points,
        message: '今天已經訪問過 pet page 了',
      })
    }
  } catch (error) {
    console.error('記錄 pet page 訪問錯誤:', error)
    return NextResponse.json({ error: '記錄訪問失敗' }, { status: 500 })
  }
}

