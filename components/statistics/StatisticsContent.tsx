'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Navigation from '@/components/dashboard/Navigation'
import { formatCurrency } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface CategoryData {
  name: string
  value: number
}

interface MonthlyStats {
  year: number
  month: number
  totalExpense: number
  totalIncome: number
  totalDeposit: number
  dailyStats: Record<string, { expense: number; income: number; deposit: number }>
  transactionCount: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function StatisticsContent() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchStats()
    fetchCategoryStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const fetchStats = async () => {
    try {
      const res = await fetch(
        `/api/statistics/monthly?year=${selectedYear}&month=${selectedMonth}`
      )
      const data = await res.json()
      setMonthlyStats(data)
    } catch (error) {
      console.error('取得統計失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch(
        `/api/statistics/categories?year=${selectedYear}&month=${selectedMonth}&type=EXPENSE`
      )
      const data = await res.json()
      setCategoryData(data.chartData || [])
    } catch (error) {
      console.error('取得類別統計失敗:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* 標題和月份選擇 - 緊湊 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">統計分析</h1>
          <div className="flex gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border rounded-md bg-white"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                (year) => (
                  <option key={year} value={year}>
                    {year} 年
                  </option>
                )
              )}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border rounded-md bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {month} 月
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 主要內容區域 - 使用 grid 布局 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          {/* 左側：總覽和圓餅圖 */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* 總覽卡片 - 緊湊 */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">總支出</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">
                    {monthlyStats ? formatCurrency(monthlyStats.totalExpense) : '$0'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">總收入</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">
                    {monthlyStats ? formatCurrency(monthlyStats.totalIncome) : '$0'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">總存款</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-purple-600">
                    {monthlyStats ? formatCurrency(monthlyStats.totalDeposit) : '$0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 類別圓餅圖 - 縮小高度 */}
            {categoryData.length > 0 && (
              <Card className="flex-1 flex flex-col overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">支出類別分布</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右側：每日統計 */}
          {monthlyStats && Object.keys(monthlyStats.dailyStats).length > 0 && (
            <Card className="flex flex-col overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">每日記錄</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-1.5">
                  {Object.entries(monthlyStats.dailyStats)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, stats]) => (
                      <div
                        key={date}
                        className="flex justify-between items-center p-2 border rounded text-sm"
                      >
                        <span className="font-medium text-xs">{date}</span>
                        <div className="flex gap-3 text-xs">
                          {stats.expense > 0 && (
                            <span className="text-red-600">
                              支出: {formatCurrency(stats.expense)}
                            </span>
                          )}
                          {stats.income > 0 && (
                            <span className="text-green-600">
                              收入: {formatCurrency(stats.income)}
                            </span>
                          )}
                          {stats.deposit > 0 && (
                            <span className="text-purple-600">
                              存款: {formatCurrency(stats.deposit)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 底部導航 */}
      <Navigation />
    </div>
  )
}

