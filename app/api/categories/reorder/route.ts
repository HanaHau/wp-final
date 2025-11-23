import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reorderSchema = z.object({
  categoryIds: z.array(z.string()),
  typeId: z.number().int().min(1).max(3),
})

// PUT /api/categories/reorder - 更新類別排序
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reorderSchema.parse(body)

    // 更新每個類別的 sortOrder
    // 只更新使用者自訂的類別（userId = user.id）
    // 使用者類別從 10 開始編號
    const updatePromises = validatedData.categoryIds.map((categoryId, index) => {
      return prisma.category.updateMany({
        where: {
          id: categoryId,
          userId: user.id, // 只更新使用者自訂的類別
          typeId: validatedData.typeId,
        },
        data: {
          sortOrder: 10 + index, // 從 10 開始排序
        },
      })
    })

    await Promise.all(updatePromises)

    return NextResponse.json({ message: '排序更新成功' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新排序錯誤:', error)
    return NextResponse.json({ error: '更新排序失敗' }, { status: 500 })
  }
}

