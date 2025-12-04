import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    // 使用台灣時區 (GMT+8) 來計算日期範圍
    // 台灣時間的月初 00:00:00 對應到 UTC 的前一天 16:00:00
    // 台灣時間的月末 23:59:59 對應到 UTC 的當天 15:59:59
    // 台灣時間 year-month-01 00:00:00 = UTC (year-month-01 00:00:00) - 8小時 = UTC (year-(month-1)-lastDay 16:00:00)
    const startDateTaiwan = new Date(year, month - 1, 1, 0, 0, 0, 0) // 台灣時間月初
    const startDate = new Date(startDateTaiwan.getTime() - 8 * 60 * 60 * 1000) // 轉為 UTC
    
    // 台灣時間 year-month-lastDay 23:59:59 = UTC (year-month-lastDay 23:59:59) - 8小時 = UTC (year-month-lastDay 15:59:59)
    const lastDay = new Date(year, month, 0).getDate()
    const endDateTaiwan = new Date(year, month - 1, lastDay, 23, 59, 59, 999) // 台灣時間月末
    const endDate = new Date(endDateTaiwan.getTime() - 8 * 60 * 60 * 1000) // 轉為 UTC

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
      .filter((t) => t.typeId === 1) // 1 = 支出
      .reduce((sum, t) => sum + t.amount, 0)

    const totalIncome = transactions
      .filter((t) => t.typeId === 2) // 2 = 收入
      .reduce((sum, t) => sum + t.amount, 0)

    // 每日統計 - 轉換為台灣時區 (GMT+8)
    const dailyStats: Record<string, { expense: number; income: number }> = {}
    transactions.forEach((t) => {
      // 將 UTC 時間轉換為台灣時區 (GMT+8)
      // t.date 是 UTC 時間，需要加上 8 小時得到台灣時間
      const utcTime = t.date.getTime()
      const taiwanTime = utcTime + (8 * 60 * 60 * 1000) // 加上 8 小時
      const taiwanDate = new Date(taiwanTime)
      const dateKey = taiwanDate.toISOString().split('T')[0]
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { expense: 0, income: 0 }
      }
      // 使用 typeId 判斷：1=支出, 2=收入
      if (t.typeId === 1) dailyStats[dateKey].expense += t.amount
      if (t.typeId === 2) dailyStats[dateKey].income += t.amount
    })

    return NextResponse.json({
      year,
      month,
      totalExpense,
      totalIncome,
      dailyStats,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('取得月統計錯誤:', error)
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 })
  }
}

