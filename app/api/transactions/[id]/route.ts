import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).optional(), // Category name (will be resolved to categoryId)
  type: z.enum(['EXPENSE', 'INCOME']).optional(), // For backward compatibility
  typeId: z.number().int().min(1).max(2).optional(), // 1=Expense, 2=Income
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

// PUT /api/transactions/[id] - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    // Get current transaction to determine typeId if not provided
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!currentTransaction) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
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

    // Calculate balance change: first revert old transaction, then apply new transaction
    let balanceDelta = 0
    
    // Revert old transaction impact
    if (currentTransaction.typeId === 1) { // EXPENSE
      balanceDelta += currentTransaction.amount
    } else if (currentTransaction.typeId === 2) { // INCOME
      balanceDelta -= currentTransaction.amount
    }

    // Apply new transaction impact
    if (typeId === 1) { // EXPENSE
      balanceDelta -= validatedData.amount
    } else if (typeId === 2) { // INCOME
      balanceDelta += validatedData.amount
    }

    // Update balance
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
      console.log(`Update transaction balance: old typeId=${currentTransaction.typeId}, new typeId=${typeId}, old amount=${currentTransaction.amount}, new amount=${validatedData.amount}, delta=${balanceDelta}, new balance=${updatedUser.balance}`)
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

    return NextResponse.json({
      ...updatedTransaction,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Update transaction error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id] - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Revert balance change
    let balanceDelta = 0
    if (transaction.typeId === 1) { // EXPENSE - revert (increase balance)
      balanceDelta = transaction.amount
    } else if (transaction.typeId === 2) { // INCOME - revert (decrease balance)
      balanceDelta = -transaction.amount
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
      console.log(`Delete transaction balance reverted: typeId=${transaction.typeId}, amount=${transaction.amount}, delta=${balanceDelta}, new balance=${updatedUser.balance}`)
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Delete transaction error:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}

