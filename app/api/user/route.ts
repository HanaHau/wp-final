import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/user - 取得使用者資訊（包含餘額）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        balance: true,
        isInitialized: true,
        userID: true,
      },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`取得使用者餘額: userId=${userRecord.id}, balance=${userRecord.balance}`)

    const response = NextResponse.json(userRecord)
    // 禁用緩存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('取得使用者資訊失敗:', error)
    return NextResponse.json({ error: 'Failed to get user information' }, { status: 500 })
  }
}

// PUT /api/user - 更新使用者資訊
export async function PUT(request: Request) {
  console.log('=== PUT /api/user 開始 ===')
  try {
    const user = await getCurrentUser()
    console.log('當前使用者:', user?.email)
    if (!user || !user.email) {
      console.log('未授權，返回 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, userID: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, userID, image } = body

    console.log('更新使用者資訊請求:', { 
      email: user.email, 
      name, 
      userID, 
      image: image ? '有圖片' : '無圖片' 
    })

    const updateData: any = {}
    // 允許更新 name（name 可以更新）
    if (name !== undefined) {
      updateData.name = name || null
    }
    // 允許更新 image
    if (image !== undefined) {
      updateData.image = image || null
    }
    if (userID !== undefined) {
      // 如果用戶已經有 userID
      if (userRecord.userID) {
        // 如果新的 userID 與現有的相同，則不視為修改，允許通過
        if (userID && userID.trim() === userRecord.userID) {
          // 不更新 userID，跳過
        } else {
          // 如果嘗試修改 userID，則不允許
          return NextResponse.json({ error: 'User ID cannot be changed after setting' }, { status: 400 })
        }
      } else {
        // 如果用戶還沒有 userID，則允許設定
        if (userID && userID.trim()) {
          const existingUser = await prisma.user.findUnique({
            where: { userID: userID.trim() },
          })
          if (existingUser && existingUser.id !== userRecord.id) {
            return NextResponse.json({ error: 'This User ID is already in use' }, { status: 400 })
          }
          updateData.userID = userID.trim()
        } else {
          updateData.userID = null
        }
      }
    }

    console.log('準備更新的資料:', updateData)
    console.log('更新前的使用者資料:', {
      id: userRecord.id,
      email: user.email,
      currentName: (await prisma.user.findUnique({ where: { id: userRecord.id }, select: { name: true } }))?.name
    })

    // 確保 updateData 不是空物件
    if (Object.keys(updateData).length === 0) {
      console.log('沒有需要更新的資料，返回當前使用者資訊')
      const currentUser = await prisma.user.findUnique({
        where: { id: userRecord.id },
        select: {
          id: true,
          email: true,
          userID: true,
          name: true,
          image: true,
          balance: true,
          isInitialized: true,
        },
      })
      return NextResponse.json(currentUser)
    }

    // 執行更新
    const updatedUser = await prisma.user.update({
      where: { id: userRecord.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        userID: true,
        name: true,
        image: true,
        balance: true,
        isInitialized: true,
      },
    })

    console.log('更新後的使用者資料（從 update 返回）:', { 
      id: updatedUser.id, 
      name: updatedUser.name, 
      userID: updatedUser.userID 
    })

    // 立即查詢資料庫驗證更新是否真的寫入
    const verifyUser = await prisma.user.findUnique({
      where: { id: userRecord.id },
      select: {
        id: true,
        email: true,
        userID: true,
        name: true,
        image: true,
      },
    })

    console.log('從資料庫驗證查詢的資料:', { 
      id: verifyUser?.id, 
      name: verifyUser?.name, 
      userID: verifyUser?.userID 
    })

    if (verifyUser?.name !== updatedUser.name) {
      console.error('⚠️ 警告：資料庫中的 name 與更新返回的 name 不一致！')
      console.error('更新返回的 name:', updatedUser.name)
      console.error('資料庫中的 name:', verifyUser?.name)
    }

    console.log('=== PUT /api/user 成功完成 ===')
    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('=== PUT /api/user 發生錯誤 ===')
    console.error('錯誤詳情:', error)
    console.error('錯誤堆疊:', error.stack)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This User ID is already in use' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user information' }, { status: 500 })
  }
}

