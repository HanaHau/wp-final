import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { updateMissionProgress } from '@/lib/missions'

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).optional(), // Category name (will be resolved to categoryId)
  type: z.enum(['EXPENSE', 'INCOME', 'DEPOSIT']).optional(), // For backward compatibility
  typeId: z.number().int().min(1).max(3).optional(), // 1=支出, 2=收入, 3=存錢
  categoryId: z.string().optional(), // Direct categoryId
  date: z.string().datetime().optional(),
  note: z.string().optional(),
})

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

    // Get current transaction to determine typeId if not provided
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!currentTransaction) {
      return NextResponse.json({ error: '找不到記錄' }, { status: 404 })
    }

    // Determine typeId
    let typeId = validatedData.typeId
    if (!typeId && validatedData.type) {
      typeId = getTypeId(validatedData.type)
    } else if (!typeId) {
      typeId = currentTransaction.typeId
    }

    // Find or get categoryId
    let categoryId = validatedData.categoryId
    if (!categoryId && validatedData.category) {
      categoryId = await findOrCreateCategory(user.id, validatedData.category, typeId)
    } else if (!categoryId) {
      categoryId = currentTransaction.categoryId
    }

    // 計算餘額變化：先回退舊交易，再應用新交易
    let balanceDelta = 0
    
    // 回退舊交易的影響
    if (currentTransaction.typeId === 1) { // EXPENSE
      balanceDelta += currentTransaction.amount
    } else if (currentTransaction.typeId === 2) { // INCOME
      balanceDelta -= currentTransaction.amount
    } else if (currentTransaction.typeId === 3) { // DEPOSIT
      balanceDelta += currentTransaction.amount
    }

    // 應用新交易的影響
    if (typeId === 1) { // EXPENSE
      balanceDelta -= validatedData.amount
    } else if (typeId === 2) { // INCOME
      balanceDelta += validatedData.amount
    } else if (typeId === 3) { // DEPOSIT
      balanceDelta -= validatedData.amount
    }

    // 處理寵物點數的變化（如果是存款）
    if (currentTransaction.typeId === 3 && typeId !== 3) {
      // 舊交易是存款，新交易不是，需要回退點數
      const pet = await prisma.pet.findUnique({
        where: { userId: user.id },
      })
      if (pet) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            points: {
              decrement: Math.floor(currentTransaction.amount),
            },
          },
        })
      }
    } else if (currentTransaction.typeId !== 3 && typeId === 3) {
      // 舊交易不是存款，新交易是，需要增加點數
      const pet = await prisma.pet.findUnique({
        where: { userId: user.id },
      })
      if (pet) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            points: {
              increment: Math.floor(validatedData.amount),
            },
          },
        })
      }
    } else if (currentTransaction.typeId === 3 && typeId === 3) {
      // 都是存款，需要調整點數差值
      const pointDelta = Math.floor(validatedData.amount) - Math.floor(currentTransaction.amount)
      if (pointDelta !== 0) {
        const pet = await prisma.pet.findUnique({
          where: { userId: user.id },
        })
        if (pet) {
          await prisma.pet.update({
            where: { id: pet.id },
            data: {
              points: {
                increment: pointDelta,
              },
            },
          })
        }
      }
    }

    // 更新餘額
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
      console.log(`更新記帳餘額: 舊typeId=${currentTransaction.typeId}, 新typeId=${typeId}, 舊amount=${currentTransaction.amount}, 新amount=${validatedData.amount}, delta=${balanceDelta}, 新餘額=${updatedUser.balance}`)
    }

    const updateData: any = {
      amount: validatedData.amount,
      categoryId: categoryId,
      typeId: typeId,
      note: validatedData.note,
    }

    if (validatedData.date) {
      updateData.date = new Date(validatedData.date)
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: {
          include: {
            type: true,
          },
        },
        type: true,
      },
    })

    // 更新任務：整理帳目(任一編輯)
    // 注意：不再自動+5pts，等使用者到任務區塊領取獎勵時再加
    const missionCompleted = await updateMissionProgress(user.id, 'daily', 'edit_transaction', 1)

    return NextResponse.json({
      ...updatedTransaction,
      missionCompleted: missionCompleted || undefined,
    })
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

    // 回退餘額變化
    let balanceDelta = 0
    if (transaction.typeId === 1) { // EXPENSE - 回退（增加餘額）
      balanceDelta = transaction.amount
    } else if (transaction.typeId === 2) { // INCOME - 回退（減少餘額）
      balanceDelta = -transaction.amount
    } else if (transaction.typeId === 3) { // DEPOSIT - 回退（增加餘額）
      balanceDelta = transaction.amount
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
      console.log(`刪除記帳餘額回退: typeId=${transaction.typeId}, amount=${transaction.amount}, delta=${balanceDelta}, 新餘額=${updatedUser.balance}`)
    }

    // 如果是存款，回退寵物點數
    if (transaction.typeId === 3) {
      const pet = await prisma.pet.findUnique({
        where: { userId: user.id },
      })
      if (pet) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: {
            points: {
              decrement: Math.floor(transaction.amount),
            },
          },
        })
      }
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

