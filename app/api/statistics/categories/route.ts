import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 使用 revalidate 快取策略，60 秒內重用相同響應
export const revalidate = 60

// GET /api/statistics/categories - 取得類別統計
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const type = searchParams.get('type') || 'EXPENSE' // 預設只看支出

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // Map type string to typeId
    const typeIdMap: Record<string, number> = {
      'EXPENSE': 1,
      'INCOME': 2,
    }
    const typeId = typeIdMap[type] || 1

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        typeId: typeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
    })

    // 按類別統計
    const categoryStats: Record<string, number> = {}
    transactions.forEach((t) => {
      const categoryName = t.category.name
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0
      }
      categoryStats[categoryName] += t.amount
    })

    // 轉換為陣列格式供圖表使用
    const chartData = Object.entries(categoryStats).map(([name, value]) => ({
      name,
      value,
    }))

    return NextResponse.json({
      year,
      month,
      type,
      categoryStats,
      chartData,
    })
  } catch (error) {
    console.error('取得類別統計錯誤:', error)
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 })
  }
}

