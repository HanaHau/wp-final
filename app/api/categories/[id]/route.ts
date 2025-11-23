import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
})

// PUT /api/categories/[id] - 更新類別
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
    })

    if (!category) {
      return NextResponse.json({ error: '找不到類別' }, { status: 404 })
    }

    // 禁止修改系統預設類別
    if (category.userId === null) {
      return NextResponse.json({ error: '無法修改系統預設類別' }, { status: 403 })
    }

    // 確保只能修改自己的類別
    if (category.userId !== user.id) {
      return NextResponse.json({ error: '無權限修改此類別' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = categoryUpdateSchema.parse(body)

    // If name is being updated, check for uniqueness
    if (validatedData.name && validatedData.name !== category.name) {
      const existing = await prisma.category.findUnique({
        where: {
          userId_typeId_name: {
            userId: user.id,
            typeId: category.typeId,
            name: validatedData.name,
          },
        },
      })

      if (existing) {
        return NextResponse.json({ error: '此類別名稱已存在' }, { status: 400 })
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        type: true,
      },
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新類別錯誤:', error)
    return NextResponse.json({ error: '更新類別失敗' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - 刪除類別
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        type: true,
      },
    })

    if (!category) {
      return NextResponse.json({ error: '找不到類別' }, { status: 404 })
    }

    // 禁止刪除系統預設類別
    if (category.userId === null) {
      return NextResponse.json({ error: '無法刪除系統預設類別' }, { status: 403 })
    }

    // 確保只能刪除自己的類別
    if (category.userId !== user.id) {
      return NextResponse.json({ error: '無權限刪除此類別' }, { status: 403 })
    }

    // 找出該 type 的 fallback 類別（「其他」）
    const fallbackCategory = await prisma.category.findFirst({
      where: {
        typeId: category.typeId,
        userId: null,
        isDefault: true,
        name: '其他',
      },
    })

    if (!fallbackCategory) {
      return NextResponse.json({ error: '找不到 fallback 類別' }, { status: 500 })
    }

    // 更新所有使用此類別的 transactions，轉移到 fallback 類別
    await prisma.transaction.updateMany({
      where: {
        categoryId: params.id,
      },
      data: {
        categoryId: fallbackCategory.id,
      },
    })

    // 刪除類別
    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '刪除成功' })
  } catch (error) {
    console.error('刪除類別錯誤:', error)
    return NextResponse.json({ error: '刪除類別失敗' }, { status: 500 })
  }
}

