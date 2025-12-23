import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRecord } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { updateMissionProgress } from '@/lib/missions'

// 使用 revalidate 快取策略，30 秒內重用相同響應（僅對 GET 請求有效）
export const revalidate = 30

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).optional(), // Category name (will be resolved to categoryId)
  type: z.enum(['EXPENSE', 'INCOME']), // For backward compatibility
  typeId: z.number().int().min(1).max(2).optional(), // 1=Expense, 2=Income
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

  // If not found, use the fallback "Other" category
  if (!category) {
    category = await prisma.category.findFirst({
      where: {
        typeId: typeId,
        userId: null,
        isDefault: true,
        name: 'Other',
      },
    })

    if (!category) {
      throw new Error(`Category not found: ${categoryName}, and fallback category not found`)
    }
  }

  return category.id
}

// GET /api/transactions - Get transaction list
export async function GET(request: NextRequest) {
  try {
    // 優化：直接使用 getCurrentUserRecord，避免額外查詢
    const user = await getCurrentUserRecord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    if (type && ['EXPENSE', 'INCOME'].includes(type)) {
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
      orderBy: { createdAt: 'desc' }, // 按添加時間排序，最新的在前
    })

    // Transform to match frontend interface (for backward compatibility)
    const transformedTransactions = transactions.map((t) => {
      // 正確映射 Type 名稱到前端格式
      // 使用 typeId 作為主要判斷依據，因為它更可靠
      let typeString: string
      if (t.typeId === 1) {
        // typeId 1 = Expense
        typeString = 'EXPENSE'
      } else if (t.typeId === 2) {
        // typeId 2 = Income
        typeString = 'INCOME'
      } else {
        // 根據 type.name 判斷（後備方案）
        const typeName = t.type.name?.toLowerCase() || ''
        if (typeName === 'expense') {
          typeString = 'EXPENSE'
        } else if (typeName === 'income') {
          typeString = 'INCOME'
        } else {
          // 處理其他類型（如 Deposit）或未知類型
          typeString = t.type.name?.toUpperCase() || 'UNKNOWN'
        }
      }

      return {
        id: t.id,
        userId: t.userId,
        amount: t.amount,
        category: t.category.name, // Keep category as string for backward compatibility
        type: typeString, // 正確映射 Type 名稱
        date: t.date.toISOString(),
        note: t.note,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        // Also include full data for future use
        categoryId: t.categoryId,
        typeId: t.typeId,
        categoryData: t.category,
        typeData: t.type,
      }
    })

    return NextResponse.json(transformedTransactions)
  } catch (error) {
    console.error('Get transaction list error:', error)
    return NextResponse.json(
      { error: 'Failed to get transaction list' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create transaction
export async function POST(request: NextRequest) {
  try {
    // 優化：直接使用 getCurrentUserRecord，避免額外查詢
    const user = await getCurrentUserRecord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Category not found' }, { status: 400 })
    }

    // Create transaction record
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

    // Update user balance
    let balanceDelta = 0
    if (typeId === 1) { // EXPENSE - Expense, balance decreases
      balanceDelta = -validatedData.amount
    } else if (typeId === 2) { // INCOME - Income, balance increases
      balanceDelta = validatedData.amount
    }

    // 更新用戶餘額並獲取新餘額
    let newBalance: number | undefined
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
      newBalance = updatedUser.balance
    } else {
      // 如果沒有餘額變化，也需要獲取當前餘額
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      })
      newBalance = currentUser?.balance
    }

    // 並行執行：更新寵物狀態和任務進度（加速響應）
    const [petStatusResult, dailyMissionResult, weeklyMissionResult] = await Promise.all([
      updatePetStatus(user.id, typeId, validatedData.amount),
      updateMissionProgress(user.id, 'daily', 'record_transaction', 1),
      updateMissionProgress(user.id, 'weekly', 'record_5_days', 1),
    ])

    // Check and reward stickers - auto sticker creation disabled
    // await checkAndRewardStickers(user.id)

    return NextResponse.json({
      ...transaction,
      newBalance, // 返回新餘額以便前端立即更新
      missionCompleted: dailyMissionResult || weeklyMissionResult || undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create transaction error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

// Helper function to update pet status
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

  // Adjust pet status based on transaction behavior
  // typeId: 1=Expense, 2=Income
  if (typeId === 1) { // EXPENSE
    // Expense slightly decreases mood (but not too low)
    moodDelta = -Math.min(2, Math.floor(amount / 500))
  } else if (typeId === 2) { // INCOME
    // Income increases mood
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

// Check and reward stickers
async function checkAndRewardStickers(userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { userId },
    include: {
      stickers: true,
    },
  })

  if (!pet) return

  // Get all transaction records
  const transactionCount = await prisma.transaction.count({
    where: { userId },
  })

  // Define reward conditions
  const rewards = [
    { condition: transactionCount >= 1, stickerId: 'rug', layer: 'floor', positionX: 0.5, positionY: 0.7 },
    { condition: transactionCount >= 5, stickerId: 'desk', layer: 'floor', positionX: 0.3, positionY: 0.5 },
    { condition: transactionCount >= 10, stickerId: 'monitor', layer: 'floor', positionX: 0.3, positionY: 0.4 },
  ]

  // Check and distribute rewards
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

