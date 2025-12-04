import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const categorySchema = z.object({
  name: z.string().min(1),
  typeId: z.number().int().min(1).max(2), // 1=支出, 2=收入
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

// GET /api/categories - 取得類別列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const typeId = searchParams.get('typeId')

    // 同時查詢預設類別（userId === null）和使用者自己的類別
    const where: any = {
      OR: [
        { userId: null }, // 預設類別
        { userId: user.id }, // 使用者自己的類別
      ],
    }

    if (typeId) {
      where.typeId = parseInt(typeId)
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        type: true,
      },
      orderBy: [
        { typeId: 'asc' },
        { userId: 'asc' }, // null (預設) 在前，非 null (使用者自訂) 在後
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('取得類別列表錯誤:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { 
        error: '取得類別列表失敗',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST /api/categories - 新增類別
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = categorySchema.parse(body)

    // Check if category already exists for this user and type
    const existing = await prisma.category.findUnique({
      where: {
        userId_typeId_name: {
          userId: user.id,
          typeId: validatedData.typeId,
          name: validatedData.name,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: '此類別已存在' }, { status: 400 })
    }

    // Get the highest sortOrder for user's custom categories of this type
    // User categories start from 10
    const maxSortOrder = await prisma.category.findFirst({
      where: {
        userId: user.id,
        typeId: validatedData.typeId,
        sortOrder: { gte: 10 }, // Only consider user categories (>= 10)
      },
      orderBy: {
        sortOrder: 'desc',
      },
      select: {
        sortOrder: true,
      },
    })

    // User categories start from 10
    const newSortOrder = maxSortOrder?.sortOrder ? maxSortOrder.sortOrder + 1 : 10

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        typeId: validatedData.typeId,
        userId: user.id,
        color: validatedData.color,
        icon: validatedData.icon,
        isDefault: false,
        sortOrder: newSortOrder,
      },
      include: {
        type: true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('資料驗證錯誤:', error.errors)
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('新增類別錯誤:', error)
    const errorMessage = error instanceof Error ? error.message : '新增類別失敗'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

