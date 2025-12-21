import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 使用 revalidate 快取策略，300 秒內重用相同響應（類別不常變動，使用較長的快取時間）
export const revalidate = 300

const categorySchema = z.object({
  name: z.string().min(1),
  typeId: z.number().int().min(1).max(2), // 1=Expense, 2=Income
  icon: z.string().nullable().optional(),
})

// GET /api/categories - Get category list
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const typeId = searchParams.get('typeId')

    // Query both default categories (userId === null) and user's own categories
    const where: any = {
      OR: [
        { userId: null }, // Default categories
        { userId: user.id }, // User's own categories
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
        { userId: 'asc' }, // null (default) first, non-null (user custom) after
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Get category list error:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { 
        error: 'Failed to get category list',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create category
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
      return NextResponse.json({ error: 'This category already exists' }, { status: 400 })
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
      console.error('Data validation error:', error.errors)
      return NextResponse.json(
        { error: 'Data validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create category error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create category'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

