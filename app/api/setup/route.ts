import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const setupSchema = z.object({
  userID: z.string().min(1).max(50),
  petName: z.string().min(1).max(20),
  petImageUrl: z.string().optional().nullable(),
  facingDirection: z.enum(['left', 'right']).default('right'),
})

// POST /api/setup - 完成首次設定
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 使用 email 查找用戶，因為 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, isInitialized: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    if (userRecord.isInitialized) {
      return NextResponse.json({ error: '已經完成首次設定' }, { status: 400 })
    }

    const dbUserId = userRecord.id

    const body = await request.json()
    console.log('收到設定請求:', { 
      ...body, 
      petImageUrl: body.petImageUrl ? `${body.petImageUrl.substring(0, 50)}...` : null 
    })
    
    const validatedData = setupSchema.parse(body)
    console.log('驗證通過:', validatedData)

    // 檢查 userID 是否已被使用
    const existingUserWithUserID = await prisma.user.findFirst({
      where: { 
        userID: validatedData.userID,
        id: { not: dbUserId }, // 排除當前用戶
      },
      select: { id: true },
    })

    if (existingUserWithUserID) {
      return NextResponse.json(
        { error: '此 userID 已被使用，請選擇其他 userID' },
        { status: 400 }
      )
    }

    // 更新使用者 userID 和設定狀態
    try {
      await prisma.user.update({
        where: { id: dbUserId },
        data: {
          userID: validatedData.userID,
          isInitialized: true,
        },
      })
      console.log('使用者更新成功')
    } catch (error: any) {
      console.error('更新使用者失敗:', error)
      // 如果是唯一性約束錯誤
      if (error.code === 'P2002' && error.meta?.target?.includes('userID')) {
        return NextResponse.json(
          { error: '此 userID 已被使用，請選擇其他 userID' },
          { status: 400 }
        )
      }
      throw error
    }

    // 建立寵物（如果不存在）
    const petImageUrl = validatedData.petImageUrl || null
    const facingDir = validatedData.facingDirection || 'right'
    
    try {
      // 先檢查寵物是否已存在
      const existingPet = await prisma.pet.findUnique({
        where: { userId: dbUserId },
      })

      if (existingPet) {
        // 如果寵物已存在，更新它
        await prisma.pet.update({
          where: { userId: dbUserId },
          data: {
            name: validatedData.petName,
            imageUrl: petImageUrl,
            facingDirection: facingDir,
          },
        })
        console.log('寵物更新成功')
      } else {
        // 如果寵物不存在，建立新的
        const now = new Date()
              await prisma.pet.create({
                data: {
                  userId: dbUserId,
                  name: validatedData.petName,
                  imageUrl: petImageUrl,
                  facingDirection: facingDir,
                  points: 50, // 新用戶初始 points 為 50
                  fullness: 70,
                  mood: 70,
                  lastLoginDate: now,
                  lastDailyReset: now,
                  consecutiveLoginDays: 0, // 初始連續登入天數為 0
                },
              })
        console.log('寵物建立成功')
      }
    } catch (error) {
      console.error('建立/更新寵物失敗:', error)
      console.error('錯誤詳情:', error instanceof Error ? error.stack : error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('資料驗證錯誤:', error.errors)
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('首次設定錯誤:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return NextResponse.json({ 
      error: '首次設定失敗',
      details: errorMessage 
    }, { status: 500 })
  }
}

// GET /api/setup - 檢查是否已完成首次設定
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 使用 email 查找用戶，因為 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { isInitialized: true },
    })

    return NextResponse.json({ 
      isInitialized: userRecord?.isInitialized ?? false 
    })
  } catch (error) {
    console.error('檢查設定狀態錯誤:', error)
    return NextResponse.json({ error: '檢查失敗' }, { status: 500 })
  }
}

