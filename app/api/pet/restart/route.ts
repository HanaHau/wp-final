import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/pet/restart - 重新開始遊戲（重置寵物狀態）
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

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 重置寵物狀態，但保留交易記錄（purchases 等會自動保留）
    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        points: 50, // 初始化為 50
        mood: 70, // 初始化為 70
        fullness: 70, // 初始化為 70
        lastLoginDate: now,
        lastDailyReset: today,
        lastPetPageVisit: null, // 重置，讓用戶可以再次獲得訪問獎勵
        consecutiveLoginDays: 0, // 重置連續登入天數
      },
    })

    return NextResponse.json({
      success: true,
      pet: updatedPet,
    })
  } catch (error) {
    console.error('重新開始遊戲錯誤:', error)
    return NextResponse.json({ error: '重新開始失敗' }, { status: 500 })
  }
}

