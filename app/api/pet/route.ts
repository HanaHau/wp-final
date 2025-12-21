import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

const petUpdateSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  imageUrl: z.string().optional(),
})

// GET /api/pet - 取得寵物資訊
export async function GET(request: NextRequest) {
  try {
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addCorsHeaders(response, request)
    }

    // 先只查詢 pet 基本資訊，不包含 purchases（減少 JOIN 查詢）
    let pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
    })

    // 如果沒有寵物，建立一隻預設寵物
    if (!pet) {
      const now = new Date()
      pet = await prisma.pet.create({
        data: {
          userId: userRecord.id,
          name: 'My Pet',
          points: 50, // 新用戶初始 points 為 50
          fullness: 70,
          mood: 70,
          lastLoginDate: now,
          lastDailyReset: now,
          consecutiveLoginDays: 0, // 初始連續登入天數為 0
        },
        // 不包含 purchases，減少查詢時間
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
    
    if (isFirstLoginToday) {
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
        // 不包含 purchases，減少查詢時間
      })
    }

    // Add warning flags and ensure imageUrl has default value
    // 不返回 purchases，減少響應大小（前端可以單獨調用 inventory API）
    const petWithWarnings = {
      ...pet,
      purchases: [], // 返回空數組，保持 API 兼容性
      imageUrl: pet.imageUrl || '/cat.png', // 如果為 null，使用預設圖片
      isUnhappy: pet.mood < 30,
      isHungry: pet.fullness < 30,
    }

    const response = NextResponse.json(petWithWarnings)
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('取得寵物資訊錯誤:', error)
    const response = NextResponse.json({ error: 'Failed to get pet information' }, { status: 500 })
    return addCorsHeaders(response, request)
  }
}

// PUT /api/pet - 更新寵物資訊
export async function PUT(request: NextRequest) {
  try {
    const userRecord = await getCurrentUserRecord()
    if (!userRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = petUpdateSchema.parse(body)

    const pet = await prisma.pet.findUnique({
      where: { userId: userRecord.id },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
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
    const response = NextResponse.json(updatedPet)
    return addCorsHeaders(response, request)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
      return addCorsHeaders(response, request)
    }
    console.error('更新寵物資訊錯誤:', error)
    const response = NextResponse.json({ error: 'Failed to update pet information' }, { status: 500 })
    return addCorsHeaders(response, request)
  }
}

