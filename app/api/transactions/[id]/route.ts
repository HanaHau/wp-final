import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME', 'DEPOSIT']),
  date: z.string().datetime().optional(),
  note: z.string().optional(),
})

// PUT /api/transactions/[id] - 更新記帳
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: '找不到記錄' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        date: validatedData.date ? new Date(validatedData.date) : undefined,
      },
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('更新記帳錯誤:', error)
    return NextResponse.json({ error: '更新記帳失敗' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id] - 刪除記帳
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: '找不到記錄' }, { status: 404 })
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '刪除成功' })
  } catch (error) {
    console.error('刪除記帳錯誤:', error)
    return NextResponse.json({ error: '刪除記帳失敗' }, { status: 500 })
  }
}

