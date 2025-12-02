import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/user - 取得使用者資訊（包含餘額）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
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
      return NextResponse.json({ error: '找不到使用者' }, { status: 404 })
    }

    console.log(`取得使用者餘額: userId=${user.id}, balance=${userRecord.balance}`)

    const response = NextResponse.json(userRecord)
    // 禁用緩存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('取得使用者資訊失敗:', error)
    return NextResponse.json({ error: '取得使用者資訊失敗' }, { status: 500 })
  }
}

// PUT /api/user - 更新使用者資訊
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { name, userID, image } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image
    if (userID !== undefined) {
      if (userID && userID.trim()) {
        const existingUser = await prisma.user.findUnique({
          where: { userID: userID.trim() },
        })
        if (existingUser && existingUser.id !== user.id) {
          return NextResponse.json({ error: '此 User ID 已被使用' }, { status: 400 })
        }
        updateData.userID = userID.trim()
      } else {
        updateData.userID = null
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
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

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('更新使用者資訊失敗:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '此 User ID 已被使用' }, { status: 400 })
    }
    return NextResponse.json({ error: '更新使用者資訊失敗' }, { status: 500 })
  }
}

