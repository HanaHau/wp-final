'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { formatCurrency } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { MonthPicker } from '@/components/ui/month-picker'
import DailyTransactionsDialog from './DailyTransactionsDialog'

interface CategoryData {
  name: string
  value: number
  color?: string | null
}

interface MonthlyStats {
  year: number
  month: number
  totalExpense: number
  totalIncome: number
  dailyStats: Record<string, { expense: number; income: number }>
  transactionCount: number
}

// 預設顏色選項（當類別沒有設定顏色時使用）
const DEFAULT_COLORS = [
  '#F0E4D4', // Light Beige
  '#F9D9CA', // Light Peach
  '#D18063', // Muted Terracotta
  '#917B56', // Olive Green
  '#B57FB3', // Medium Purple
  '#6ECEDA', // Light Blue
  '#E098AE', // Dusty Rose
  '#D5CB8E', // Light Yellow
]

const GREEN_TINT = '#2D5016' // Dark green for positive
const RED_TINT = '#5A1F1F' // Dark red for negative

export default function StatisticsContent() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [prevMonthStats, setPrevMonthStats] = useState<MonthlyStats | null>(null)
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDailyDialog, setShowDailyDialog] = useState(false)
  const [budget, setBudget] = useState(50000) // Default budget, can be made configurable

  useEffect(() => {
    fetchStats()
    fetchPrevMonthStats()
    fetchCategoryStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/statistics/monthly?year=${selectedYear}&month=${selectedMonth}`
      )
      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = await res.json()
      // Ensure dailyStats exists even if empty
      if (!data.dailyStats) {
        data.dailyStats = {}
      }
      setMonthlyStats(data)
    } catch (error) {
      console.error('取得統計失敗:', error)
      // Set default empty stats on error
      setMonthlyStats({
        year: selectedYear,
        month: selectedMonth,
        totalExpense: 0,
        totalIncome: 0,
        dailyStats: {},
        transactionCount: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPrevMonthStats = async () => {
    try {
      let prevMonth = selectedMonth - 1
      let prevYear = selectedYear
      if (prevMonth === 0) {
        prevMonth = 12
        prevYear = prevYear - 1
      }
      const res = await fetch(
        `/api/statistics/monthly?year=${prevYear}&month=${prevMonth}`
      )
      const data = await res.json()
      setPrevMonthStats(data)
    } catch (error) {
      console.error('取得上月統計失敗:', error)
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

  const handleMonthSelect = (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    setShowDailyDialog(true)
  }

  const netIncome = (monthlyStats?.totalIncome || 0) - (monthlyStats?.totalExpense || 0)
  const prevNetIncome = (prevMonthStats?.totalIncome || 0) - (prevMonthStats?.totalExpense || 0)
  const netChange = prevNetIncome !== 0 
    ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome) * 100).toFixed(1)
    : '0'
  const netChangeValue = netIncome - prevNetIncome


  // Calculate expense change
  const expenseChange = prevMonthStats?.totalExpense 
    ? ((monthlyStats?.totalExpense || 0) - prevMonthStats.totalExpense) / prevMonthStats.totalExpense * 100
    : 0


  // Get all days in month for bar chart
  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const daysWithData = monthlyStats?.dailyStats ? Object.keys(monthlyStats.dailyStats).length : 0
  const hasOnlyOneDay = daysWithData === 1

  // Prepare bar chart data with all days
  const barChartData = daysInMonth.map(day => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayStats = monthlyStats?.dailyStats?.[dateStr]
    return {
      date: day,
      expense: dayStats?.expense || 0,
      hasData: !!dayStats,
      opacity: dayStats ? 1 : 0.2,
    }
  })

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
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm p-3 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div 
            className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => setShowMonthPicker(true)}
          >
            <div className="text-lg font-bold uppercase">{monthNames[selectedMonth - 1]} {selectedYear}</div>
            <div className="text-xs text-black/60">{monthlyStats?.transactionCount || 0} transactions</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month vs Previous Month Comparison */}
        {prevMonthStats && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Month Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Expense:</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${
                    expenseChange > 0 ? 'text-red-700' : expenseChange < 0 ? 'text-green-700' : 'text-black'
                  }`}>
                    {expenseChange > 0 ? <ArrowUp className="h-4 w-4" /> : expenseChange < 0 ? <ArrowDown className="h-4 w-4" /> : null}
                    {Math.abs(expenseChange).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Net:</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${
                    netChangeValue > 0 ? 'text-green-700' : netChangeValue < 0 ? 'text-red-700' : 'text-black'
                  }`}>
                    {netChangeValue > 0 ? <ArrowUp className="h-4 w-4" /> : netChangeValue < 0 ? <ArrowDown className="h-4 w-4" /> : null}
                    {Math.abs(parseFloat(netChange)).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {monthlyStats ? formatCurrency(monthlyStats.totalIncome) : '$0'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {monthlyStats ? formatCurrency(monthlyStats.totalExpense) : '$0'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Net</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                netIncome > 0 ? 'text-green-700' : netIncome < 0 ? 'text-red-700' : 'text-black'
              }`}>
                {formatCurrency(netIncome)}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Expense by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#000"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => {
                            // 使用類別的顏色，如果沒有則使用預設顏色
                            const color = entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={color}
                              />
                            )
                          })}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-48 flex flex-col justify-center gap-2">
                    {categoryData.map((entry, index) => {
                      const total = categoryData.reduce((sum, item) => sum + item.value, 0)
                      const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'
                      return (
                        <div key={entry.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                              className="w-3 h-3 border border-black flex-shrink-0"
                              style={{ backgroundColor: entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                            />
                            <span className="text-xs font-medium truncate">{entry.name}</span>
                            <span className="text-xs font-bold">({percentage}%)</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            
                            <span className="text-xs font-bold">{formatCurrency(entry.value)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <div className="text-lg font-bold mb-2">No Records This Month</div>
                  <div className="text-sm text-black/60">Start tracking your expenses to see category breakdown</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Expense Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Daily Expenses</CardTitle>
              {hasOnlyOneDay && (
                <p className="text-xs text-black/60 mt-1">Only 1 day recorded this month</p>
              )}
            </CardHeader>
            <CardContent>
              {monthlyStats?.dailyStats && Object.keys(monthlyStats.dailyStats).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#000" />
                    <YAxis stroke="#000" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="expense" fill="#000">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#000" opacity={entry.opacity} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <div className="text-4xl mb-4">📈</div>
                  <div className="text-lg font-bold mb-2">No Daily Data</div>
                  <div className="text-sm text-black/60">No expenses recorded this month</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Transactions List */}
        {monthlyStats?.dailyStats && Object.keys(monthlyStats.dailyStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(monthlyStats.dailyStats || {})
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, stats]) => (
                    <div
                      key={date}
                      onClick={() => handleDateClick(date)}
                      className="flex justify-between items-center p-3 rounded-lg border border-black/20 cursor-pointer hover:bg-black/5 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        {stats.income > 0 && (
                          <span className="font-medium text-green-700">
                            +{formatCurrency(stats.income)}
                          </span>
                        )}
                        {stats.expense > 0 && (
                          <span className="font-medium text-red-700">
                            -{formatCurrency(stats.expense)}
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

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <MonthPicker
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelect={handleMonthSelect}
          onClose={() => setShowMonthPicker(false)}
        />
      )}

      {/* Daily Transactions Dialog */}
      <DailyTransactionsDialog
        open={showDailyDialog}
        onOpenChange={setShowDailyDialog}
        date={selectedDate}
        onTransactionUpdate={() => {
          fetchStats()
          fetchCategoryStats()
        }}
      />

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}
