'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { formatCurrency } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Link from 'next/link'

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

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const netIncome = (monthlyStats?.totalIncome || 0) - (monthlyStats?.totalExpense || 0)
  const savingsRate = monthlyStats?.totalIncome 
    ? ((monthlyStats.totalDeposit / monthlyStats.totalIncome) * 100).toFixed(1)
    : '0'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Statistics</h1>
          <Link href="/transactions">
            <Button variant="outline" size="sm" className="border-2 border-black">
              View All
            </Button>
          </Link>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 border-2 border-black p-3">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="border-2 border-black">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="text-lg font-bold uppercase">{monthNames[selectedMonth - 1]} {selectedYear}</div>
            <div className="text-xs text-black/60">{monthlyStats?.transactionCount || 0} transactions</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="border-2 border-black">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {monthlyStats ? formatCurrency(monthlyStats.totalIncome) : '$0'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {monthlyStats ? formatCurrency(monthlyStats.totalExpense) : '$0'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-black' : 'text-black'}`}>
                {formatCurrency(netIncome)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {savingsRate}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Pie Chart */}
          {categoryData.length > 0 && (
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Expense by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#000"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? '#000' : '#666'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Daily Expense Bar Chart */}
          {monthlyStats && Object.keys(monthlyStats.dailyStats).length > 0 && (
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Daily Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(monthlyStats.dailyStats)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, stats]) => ({
                        date: new Date(date).getDate(),
                        expense: stats.expense,
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#000" />
                    <YAxis stroke="#000" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="expense" fill="#000" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Daily Transactions List */}
        {monthlyStats && Object.keys(monthlyStats.dailyStats).length > 0 && (
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(monthlyStats.dailyStats)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, stats]) => (
                    <div
                      key={date}
                      className="flex justify-between items-center p-3 border-2 border-black"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        {stats.income > 0 && (
                          <span className="font-medium">
                            +{formatCurrency(stats.income)}
                          </span>
                        )}
                        {stats.expense > 0 && (
                          <span className="font-medium">
                            -{formatCurrency(stats.expense)}
                          </span>
                        )}
                        {stats.deposit > 0 && (
                          <span className="font-medium text-black/60">
                            Deposit: {formatCurrency(stats.deposit)}
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

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}

