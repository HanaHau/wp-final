import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { updateMissionProgress } from '@/lib/missions'

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).optional(), // Category name (will be resolved to categoryId)
  type: z.enum(['EXPENSE', 'INCOME', 'DEPOSIT']), // For backward compatibility
  typeId: z.number().int().min(1).max(3).optional(), // 1=支出, 2=收入, 3=存錢
  categoryId: z.string().optional(), // Direct categoryId (optional, will resolve from category name if not provided)
  date: z.string().datetime().optional(),
  note: z.string().optional(),
}).refine(
  (data) => data.categoryId || data.category,
  {
    message: 'Either categoryId or category must be provided',
    path: ['categoryId'],
  }
)

// Helper function to map type string to typeId
function getTypeId(type: string): number {
  switch (type) {
    case 'EXPENSE':
      return 1
    case 'INCOME':
      return 2
    case 'DEPOSIT':
      return 3
    default:
      return 1
  }
}

// Helper function to find or create category
async function findOrCreateCategory(
  userId: string,
  categoryName: string,
  typeId: number
): Promise<string> {
  // First, try to find existing category (user's custom or system default)
  let category = await prisma.category.findFirst({
    where: {
      name: categoryName,
      typeId: typeId,
      OR: [
        { userId: userId },
        { userId: null }, // System default
      ],
    },
    orderBy: [
      { userId: 'desc' }, // Prefer user's custom category
    ],
  })

  // If not found, use the fallback "其他" category
  if (!category) {
    category = await prisma.category.findFirst({
      where: {
        typeId: typeId,
        userId: null,
        isDefault: true,
        name: '其他',
      },
    })

    if (!category) {
      throw new Error(`找不到類別: ${categoryName}，且找不到 fallback 類別`)
    }
  }

  return category.id
}

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
      where.typeId = getTypeId(type)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: {
          include: {
            type: true,
          },
        },
        type: true,
      },
      orderBy: { date: 'desc' },
    })

    // Transform to match frontend interface (for backward compatibility)
    const transformedTransactions = transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      category: t.category.name, // Keep category as string for backward compatibility
      type: t.type.name === '支出' ? 'EXPENSE' : t.type.name === '收入' ? 'INCOME' : 'DEPOSIT', // Map back to string (Type model)
      date: t.date.toISOString(),
      note: t.note,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      // Also include full data for future use
      categoryId: t.categoryId,
      typeId: t.typeId,
      categoryData: t.category,
      typeData: t.type,
    }))

    return NextResponse.json(transformedTransactions)
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

    // Determine typeId
    const typeId = validatedData.typeId || getTypeId(validatedData.type)

    // Find or get categoryId
    let categoryId = validatedData.categoryId
    if (!categoryId && validatedData.category) {
      categoryId = await findOrCreateCategory(user.id, validatedData.category, typeId)
    }

    if (!categoryId) {
      return NextResponse.json({ error: '找不到類別' }, { status: 400 })
    }

    // 建立記帳記錄
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: validatedData.amount,
        categoryId: categoryId,
        typeId: typeId,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        note: validatedData.note,
      },
      include: {
        category: {
          include: {
            type: true,
          },
        },
        type: true,
      },
    })

    // 更新用戶餘額
    let balanceDelta = 0
    if (typeId === 1) { // EXPENSE - 支出，餘額減少
      balanceDelta = -validatedData.amount
    } else if (typeId === 2) { // INCOME - 收入，餘額增加
      balanceDelta = validatedData.amount
    } else if (typeId === 3) { // DEPOSIT - 存錢，餘額減少（等同於拿餘額的錢去買 points）
      balanceDelta = -validatedData.amount
    }

    if (balanceDelta !== 0) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: {
            increment: balanceDelta,
          },
        },
        select: {
          balance: true,
        },
      })
      console.log(`餘額更新: typeId=${typeId}, amount=${validatedData.amount}, delta=${balanceDelta}, 新餘額=${updatedUser.balance}`)
    }

    // 如果是存款，更新寵物點數
    if (typeId === 3) { // DEPOSIT
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
    await updatePetStatus(user.id, typeId, validatedData.amount)

    // 更新任務：今日記帳1筆
    await updateMissionProgress(user.id, 'daily', 'record_transaction', 1)

    // 記一筆帳 +10 points
    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (pet) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          points: {
            increment: 10,
          },
        },
      })
    }

    // 檢查並發放貼紙獎勵 - 已禁用自動創建 sticker
    // await checkAndRewardStickers(user.id)

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
  typeId: number,
  amount: number
) {
  const pet = await prisma.pet.findUnique({
    where: { userId },
  })

  if (!pet) return

  let fullnessDelta = 0
  let moodDelta = 0

  // 根據記帳行為調整寵物狀態
  // typeId: 1=支出, 2=收入, 3=存錢
  if (typeId === 3) { // DEPOSIT
    // 存款增加飽足感和心情
    fullnessDelta = Math.min(5, Math.floor(amount / 100))
    moodDelta = Math.min(5, Math.floor(amount / 100))
  } else if (typeId === 1) { // EXPENSE
    // 支出稍微降低心情（但不會太低）
    moodDelta = -Math.min(2, Math.floor(amount / 500))
  } else if (typeId === 2) { // INCOME
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

// 檢查並發放貼紙獎勵
async function checkAndRewardStickers(userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { userId },
    include: {
      stickers: true,
    },
  })

  if (!pet) return

  // 取得所有交易記錄
  const transactionCount = await prisma.transaction.count({
    where: { userId },
  })

  const totalDeposits = await prisma.transaction.aggregate({
    where: {
      userId,
      typeId: 3, // DEPOSIT
    },
    _sum: {
      amount: true,
    },
  })

  const totalDepositAmount = totalDeposits._sum.amount || 0

  // 定義獎勵條件
  const rewards = [
    { condition: transactionCount >= 1, stickerId: 'rug', layer: 'floor', positionX: 0.5, positionY: 0.7 },
    { condition: transactionCount >= 5, stickerId: 'desk', layer: 'floor', positionX: 0.3, positionY: 0.5 },
    { condition: transactionCount >= 10, stickerId: 'monitor', layer: 'floor', positionX: 0.3, positionY: 0.4 },
    { condition: totalDepositAmount >= 1000, stickerId: 'poster', layer: 'wall-left', positionX: 0.5, positionY: 0.3 },
    { condition: totalDepositAmount >= 5000, stickerId: 'cup', layer: 'floor', positionX: 0.7, positionY: 0.5 },
    { condition: totalDepositAmount >= 10000, stickerId: 'speaker', layer: 'floor', positionX: 0.7, positionY: 0.6 },
  ]

  // 檢查並發放獎勵
  for (const reward of rewards) {
    const hasSticker = pet.stickers.some((s) => s.stickerId === reward.stickerId)
    if (reward.condition && !hasSticker) {
      await prisma.roomSticker.create({
        data: {
          petId: pet.id,
          stickerId: reward.stickerId,
          positionX: reward.positionX,
          positionY: reward.positionY,
          rotation: 0,
          scale: 1,
          layer: reward.layer as 'floor' | 'wall-left' | 'wall-right',
        },
      })
    }
  }
}

