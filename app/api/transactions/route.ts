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

// GET /api/transactions - 取得記帳列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    const where: any = {
      userId: user.id,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    if (type && ['EXPENSE', 'INCOME', 'DEPOSIT'].includes(type)) {
      where.type = type
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('取得記帳列表錯誤:', error)
    return NextResponse.json(
      { error: '取得記帳列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - 新增記帳
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    // 建立記帳記錄
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: validatedData.amount,
        category: validatedData.category,
        type: validatedData.type,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        note: validatedData.note,
      },
    })

    // 如果是存款，更新寵物點數
    if (validatedData.type === 'DEPOSIT') {
      const pet = await prisma.pet.findUnique({
        where: { userId: user.id },
      })

      if (pet) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            points: {
              increment: Math.floor(validatedData.amount), // 1 元 = 1 點數
            },
          },
        })
      }
    }

    // 更新寵物狀態（根據記帳行為）
    await updatePetStatus(user.id, validatedData.type, validatedData.amount)

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('新增記帳錯誤:', error)
    return NextResponse.json({ error: '新增記帳失敗' }, { status: 500 })
  }
}

// 更新寵物狀態的輔助函數
async function updatePetStatus(
  userId: string,
  type: string,
  amount: number
) {
  const pet = await prisma.pet.findUnique({
    where: { userId },
  })

  if (!pet) return

  let fullnessDelta = 0
  let moodDelta = 0

  // 根據記帳行為調整寵物狀態
  if (type === 'DEPOSIT') {
    // 存款增加飽足感和心情
    fullnessDelta = Math.min(5, Math.floor(amount / 100))
    moodDelta = Math.min(5, Math.floor(amount / 100))
  } else if (type === 'EXPENSE') {
    // 支出稍微降低心情（但不會太低）
    moodDelta = -Math.min(2, Math.floor(amount / 500))
  } else if (type === 'INCOME') {
    // 收入增加心情
    moodDelta = Math.min(3, Math.floor(amount / 1000))
  }

  await prisma.pet.update({
    where: { id: pet.id },
    data: {
      fullness: Math.max(0, Math.min(100, pet.fullness + fullnessDelta)),
      mood: Math.max(0, Math.min(100, pet.mood + moodDelta)),
    },
  })
}

