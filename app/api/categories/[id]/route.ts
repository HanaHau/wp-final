import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

// PUT /api/categories/[id] - 更新類別
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const categoryId = resolvedParams.id

    if (!categoryId) {
      return NextResponse.json({ error: '缺少類別 ID' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: '找不到類別' }, { status: 404 })
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
      where: { id: categoryId },
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const categoryId = resolvedParams.id

    if (!categoryId) {
      return NextResponse.json({ error: '缺少類別 ID' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        type: true,
      },
    })

    if (!category) {
      return NextResponse.json({ error: '找不到類別' }, { status: 404 })
    }

    // 確保只能刪除自己的類別
    if (category.userId !== user.id) {
      return NextResponse.json({ error: '無權限刪除此類別' }, { status: 403 })
    }

    // 檢查是否有交易使用此類別
    const transactionsUsingCategory = await prisma.transaction.findFirst({
      where: {
        categoryId: categoryId,
      },
    })

    if (transactionsUsingCategory) {
      return NextResponse.json({ 
        error: '無法刪除此類別，因為仍有交易使用此類別。請先刪除或修改相關交易。' 
      }, { status: 400 })
    }

    // 刪除類別
    await prisma.category.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ message: '刪除成功' })
  } catch (error) {
    console.error('刪除類別錯誤:', error)
    return NextResponse.json({ error: '刪除類別失敗' }, { status: 500 })
  }
}

