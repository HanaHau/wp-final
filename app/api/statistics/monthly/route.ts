import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/statistics/monthly - 取得月統計
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalDeposit = transactions
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0)

    // 每日統計
    const dailyStats: Record<string, { expense: number; income: number; deposit: number }> = {}
    transactions.forEach((t) => {
      const dateKey = t.date.toISOString().split('T')[0]
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { expense: 0, income: 0, deposit: 0 }
      }
      if (t.type === 'EXPENSE') dailyStats[dateKey].expense += t.amount
      if (t.type === 'INCOME') dailyStats[dateKey].income += t.amount
      if (t.type === 'DEPOSIT') dailyStats[dateKey].deposit += t.amount
    })

    return NextResponse.json({
      year,
      month,
      totalExpense,
      totalIncome,
      totalDeposit,
      dailyStats,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('取得月統計錯誤:', error)
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 })
  }
}

