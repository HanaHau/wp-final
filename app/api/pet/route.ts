import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { updateMissionProgress } from '@/lib/missions'

const petUpdateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  imageUrl: z.string().optional(),
})

// GET /api/pet - 取得寵物資訊
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    let pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
      include: {
        purchases: {
          orderBy: { purchasedAt: 'desc' },
          take: 10,
        },
      },
    })

    // 如果沒有寵物，建立一隻預設寵物
    if (!pet) {
      const now = new Date()
      pet = await prisma.pet.create({
        data: {
          userId: userRecord.id,
          name: '我的寵物',
          points: 50, // 新用戶初始 points 為 50
          fullness: 70,
          mood: 70,
          lastLoginDate: now,
          lastDailyReset: now,
          consecutiveLoginDays: 0, // 初始連續登入天數為 0
        },
        include: {
          purchases: true,
        },
      })
    }

    // 每日重置邏輯（00:00 刷新）
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastReset = pet.lastDailyReset ? new Date(pet.lastDailyReset) : null
    
    // 檢查是否需要每日重置（如果 lastDailyReset 是昨天或更早）
    const needsDailyReset = !lastReset || lastReset < today
    
    // 檢查是否為當天第一次登入
    const lastLogin = pet.lastLoginDate ? new Date(pet.lastLoginDate) : null
    const isFirstLoginToday = !lastLogin || lastLogin < today
    
    let updateData: {
      mood?: number
      fullness?: number
      points?: number
      lastLoginDate?: Date
      lastDailyReset?: Date
      consecutiveLoginDays?: number
    } = {}
    
    // 如果需要每日重置
    if (needsDailyReset) {
      // Mood 每天 -25 點, Fullness 每天 -10 點
      const newMood = Math.max(0, pet.mood - 25) // -25 點
      const newFullness = Math.max(0, pet.fullness - 10) // -10 點
      updateData.mood = newMood
      updateData.fullness = newFullness
      updateData.lastDailyReset = today
    }
    
    let missionCompleted = null
    if (isFirstLoginToday) {
      // 更新任務：查看寵物狀態
      missionCompleted = await updateMissionProgress(userRecord.id, 'daily', 'check_pet', 1)
      const currentMood = updateData.mood ?? pet.mood
      updateData.mood = Math.min(100, currentMood + 5) // 直接 +5
      updateData.lastLoginDate = now
      
      // 檢查連續登入
      if (lastLogin) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())
        
        // 如果最後登入是昨天，連續登入天數 +1
        if (lastLoginDate.getTime() === yesterday.getTime()) {
          const newConsecutiveDays = (pet.consecutiveLoginDays || 0) + 1
          updateData.consecutiveLoginDays = newConsecutiveDays
          
          // 如果連續登入達到5天，給予20點獎勵
          if (newConsecutiveDays >= 5) {
            updateData.points = (pet.points || 0) + 20
            updateData.consecutiveLoginDays = 0 // 重置連續登入天數
            console.log(`連續登入5天獎勵：+20 points`)
          }
        } else {
          // 如果不是連續登入（中間有間斷），重置為1
          updateData.consecutiveLoginDays = 1
        }
      } else {
        // 如果沒有最後登入記錄，設為1（第一次登入或重置後）
        updateData.consecutiveLoginDays = 1
      }
    } else if (!pet.lastLoginDate) {
      // 如果 lastLoginDate 為 null，也更新它
      updateData.lastLoginDate = now
      updateData.consecutiveLoginDays = 1
    }
    
    // 如果有需要更新的數據，執行更新
    if (Object.keys(updateData).length > 0) {
      pet = await prisma.pet.update({
        where: { id: pet.id },
        data: updateData,
        include: {
          purchases: true,
        },
      })
    }

    // Add warning flags and ensure imageUrl has default value
    const petWithWarnings = {
      ...pet,
      imageUrl: pet.imageUrl || '/cat.png', // 如果為 null，使用預設圖片
      isUnhappy: pet.mood < 30,
      isHungry: pet.fullness < 30,
    }

    return NextResponse.json({
      ...petWithWarnings,
      missionCompleted: missionCompleted || undefined,
    })
  } catch (error) {
    console.error('取得寵物資訊錯誤:', error)
    return NextResponse.json({ error: '取得寵物資訊失敗' }, { status: 500 })
  }
}

// PUT /api/pet - 更新寵物資訊
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = petUpdateSchema.parse(body)

    const pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
    })

    if (!pet) {
      return NextResponse.json({ error: '找不到寵物' }, { status: 404 })
    }

    // Only update fields that are provided
    const updateData: { name?: string; imageUrl?: string | null } = {}
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.imageUrl !== undefined) {
      updateData.imageUrl = validatedData.imageUrl || null
    }

    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: updateData,
    })

    console.log('寵物名稱更新成功:', { id: updatedPet.id, name: updatedPet.name })
    return NextResponse.json(updatedPet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新寵物資訊錯誤:', error)
    return NextResponse.json({ error: '更新寵物資訊失敗' }, { status: 500 })
  }
}

