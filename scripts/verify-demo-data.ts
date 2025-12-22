import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 驗證 demo@example.com 的記帳資料...\n')

  const user = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
    include: {
      transactions: {
        include: {
          category: true,
          type: true,
        },
        orderBy: { date: 'desc' },
      },
      pet: true,
    },
  })

  if (!user) {
    console.log('❌ 找不到 demo@example.com 用戶')
    return
  }

  console.log('👤 用戶資訊：')
  console.log(`   名稱：${user.name}`)
  console.log(`   餘額：$${user.balance.toFixed(2)}`)
  console.log(`   交易數：${user.transactions.length} 筆\n`)

  if (user.pet) {
    console.log('🐾 寵物狀態：')
    console.log(`   名稱：${user.pet.name}`)
    console.log(`   心情：${user.pet.mood}`)
    console.log(`   飽足感：${user.pet.fullness}`)
    console.log(`   點數：${user.pet.points}\n`)
  }

  // 統計支出和收入
  const expenses = user.transactions.filter(t => t.typeId === 1)
  const incomes = user.transactions.filter(t => t.typeId === 2)

  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0)

  console.log('📊 交易統計：')
  console.log(`   支出：${expenses.length} 筆，總計 $${totalExpense.toFixed(2)}`)
  console.log(`   收入：${incomes.length} 筆，總計 $${totalIncome.toFixed(2)}`)
  console.log(`   淨餘額：$${(totalIncome - totalExpense).toFixed(2)}\n`)

  // 按類別統計支出
  const expenseByCategory: Record<string, { count: number; total: number }> = {}
  expenses.forEach(t => {
    const catName = t.category.name
    if (!expenseByCategory[catName]) {
      expenseByCategory[catName] = { count: 0, total: 0 }
    }
    expenseByCategory[catName].count++
    expenseByCategory[catName].total += t.amount
  })

  console.log('📈 支出類別分布：')
  Object.entries(expenseByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, stats]) => {
      console.log(`   ${cat}: ${stats.count} 筆，$${stats.total.toFixed(2)}`)
    })

  console.log('\n📅 時間分布：')
  const dates = user.transactions.map(t => t.date.toISOString().split('T')[0])
  const uniqueDates = new Set(dates)
  const oldestDate = dates[dates.length - 1]
  const newestDate = dates[0]
  console.log(`   最早記錄：${oldestDate}`)
  console.log(`   最新記錄：${newestDate}`)
  console.log(`   有記錄的天數：${uniqueDates.size} 天`)

  // 顯示最近的 5 筆交易
  console.log('\n📝 最近的 5 筆交易：')
  user.transactions.slice(0, 5).forEach(t => {
    const type = t.typeId === 1 ? '支出' : '收入'
    const date = t.date.toISOString().split('T')[0]
    console.log(`   ${date} | ${type} | ${t.category.name} | $${t.amount.toFixed(2)} ${t.note ? `| ${t.note}` : ''}`)
  })

  console.log('\n✅ 驗證完成！')
}

main()
  .catch((e) => {
    console.error('❌ 錯誤：', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


