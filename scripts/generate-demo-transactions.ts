import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 生成隨機整數（包含 min 和 max）
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成隨機浮點數（包含 min 和 max）
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// 從陣列中隨機選擇一個元素
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// 生成隨機日期（過去 N 天內）
function randomDate(daysAgo: number): Date {
  const now = new Date()
  const daysBack = randomInt(0, daysAgo)
  const date = new Date(now)
  date.setDate(date.getDate() - daysBack)
  
  // 隨機時間（早中晚）
  const hour = randomChoice([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
  const minute = randomInt(0, 59)
  date.setHours(hour, minute, 0, 0)
  
  return date
}

// 支出類別的備註模板
const expenseNotes: Record<string, string[]> = {
  Food: ['早餐', '午餐', '晚餐', '下午茶', '咖啡', '零食', '宵夜', '便當', '麥當勞', '7-11'],
  Transportation: ['捷運', '公車', '計程車', 'Uber', '停車費', '油錢', '月票'],
  Entertainment: ['電影', 'Netflix', 'Spotify', '遊戲', 'KTV', '展覽', '演唱會'],
  Shopping: ['衣服', '鞋子', '日用品', '3C產品', '書', '化妝品', '禮物'],
  Healthcare: ['看醫生', '買藥', '健檢', '牙醫', '掛號費'],
  Education: ['書籍', '線上課程', '補習費', '文具'],
  Work: ['午餐', '文具', '咖啡', '會議餐費'],
  Housing: ['房租', '水電費', '網路費', '管理費', '瓦斯費'],
  Other: ['雜項', '其他', '忘記了'],
}

// 收入類別的備註模板
const incomeNotes: Record<string, string[]> = {
  Salary: ['月薪', '薪資', '工資'],
  Bonus: ['年終獎金', '績效獎金', '專案獎金', '紅包'],
  Investment: ['股票收益', '基金分紅', '投資獲利'],
  Gift: ['生日禮金', '結婚禮金', '紅包', '禮物'],
  Other: ['其他收入', '兼職', '退款'],
}

async function main() {
  console.log('🚀 開始為 demo@example.com 生成記帳資料...\n')

  // 1. 檢查或創建 demo@example.com 用戶
  let demoUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  })

  if (!demoUser) {
    console.log('📝 創建 demo@example.com 用戶...')
    demoUser = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        name: 'Demo User',
        balance: 0,
        isInitialized: true,
        hasCompletedTutorial: true,
      },
    })
    console.log('✅ 用戶創建成功！\n')
  } else {
    console.log('✅ 找到現有用戶\n')
  }

  // 2. 確保用戶有寵物
  let pet = await prisma.pet.findUnique({
    where: { userId: demoUser.id },
  })

  if (!pet) {
    console.log('🐾 創建寵物...')
    pet = await prisma.pet.create({
      data: {
        userId: demoUser.id,
        name: 'My Pet',
        points: 0,
        fullness: 70,
        mood: 70,
      },
    })
    console.log('✅ 寵物創建成功！\n')
  }

  // 3. 獲取所有預設類別
  console.log('📂 獲取預設類別...')
  const expenseCategories = await prisma.category.findMany({
    where: {
      typeId: 1, // Expense
      userId: null, // 預設類別
    },
  })

  const incomeCategories = await prisma.category.findMany({
    where: {
      typeId: 2, // Income
      userId: null, // 預設類別
    },
  })

  console.log(`✅ 找到 ${expenseCategories.length} 個支出類別，${incomeCategories.length} 個收入類別\n`)

  if (expenseCategories.length === 0 || incomeCategories.length === 0) {
    console.error('❌ 找不到預設類別，請先執行 seed 腳本')
    return
  }

  // 4. 檢查是否已有交易記錄
  const existingTransactions = await prisma.transaction.count({
    where: { userId: demoUser.id },
  })

  if (existingTransactions > 0) {
    console.log(`⚠️  發現 ${existingTransactions} 筆現有交易記錄`)
    console.log('是否要清除現有記錄並重新生成？(y/n)')
    // 這裡我們直接清除，因為是腳本執行
    console.log('清除現有交易記錄...')
    await prisma.transaction.deleteMany({
      where: { userId: demoUser.id },
    })
    console.log('✅ 已清除現有記錄\n')
  }

  // 5. 生成交易資料
  console.log('💰 開始生成交易資料...\n')

  const transactions: Array<{
    userId: string
    amount: number
    categoryId: string
    typeId: number
    date: Date
    note: string | null
  }> = []

  // 支出類別權重分布（百分比）
  const expenseWeights: Record<string, number> = {
    Food: 30,
    Transportation: 15,
    Entertainment: 10,
    Shopping: 15,
    Healthcare: 5,
    Education: 5,
    Work: 5,
    Housing: 10,
    Other: 5,
  }

  // 收入類別權重分布
  const incomeWeights: Record<string, number> = {
    Salary: 70,
    Bonus: 10,
    Investment: 10,
    Gift: 5,
    Other: 5,
  }

  // 生成過去 120 天的資料（約 4 個月）
  const daysBack = 120
  let totalExpense = 0
  let totalIncome = 0

  // 生成每月薪資（過去 4 個月）
  const salaryCategory = incomeCategories.find(cat => cat.name === 'Salary')
  if (salaryCategory) {
    for (let month = 0; month < 4; month++) {
      const salaryDate = new Date()
      salaryDate.setMonth(salaryDate.getMonth() - month)
      salaryDate.setDate(1) // 每月 1 號
      salaryDate.setHours(9, 0, 0, 0) // 早上 9 點
      
      const salaryAmount = randomInt(50000, 70000)
      transactions.push({
        userId: demoUser.id,
        amount: salaryAmount,
        categoryId: salaryCategory.id,
        typeId: 2,
        date: salaryDate,
        note: randomChoice(incomeNotes.Salary || ['月薪']),
      })
      totalIncome += salaryAmount
    }
  }

  // 生成其他收入（偶爾）
  for (let i = 0; i < 8; i++) {
    const category = randomChoice(incomeCategories.filter(cat => cat.name !== 'Salary'))
    const date = randomDate(daysBack)
    
    let amount = 0
    if (category.name === 'Bonus') {
      amount = randomInt(5000, 20000)
    } else if (category.name === 'Investment') {
      amount = randomInt(1000, 10000)
    } else if (category.name === 'Gift') {
      amount = randomInt(500, 5000)
    } else {
      amount = randomInt(1000, 5000)
    }

    transactions.push({
      userId: demoUser.id,
      amount: amount,
      categoryId: category.id,
      typeId: 2,
      date: date,
      note: randomChoice(incomeNotes[category.name] || ['其他收入']),
    })
    totalIncome += amount
  }

  // 生成支出（每天 1-3 筆，減少支出）
  for (let day = 0; day < daysBack; day++) {
    const transactionsPerDay = randomInt(1, 3)
    
    for (let i = 0; i < transactionsPerDay; i++) {
      // 根據權重選擇類別
      const randomWeight = Math.random() * 100
      let cumulativeWeight = 0
      let selectedCategoryName = 'Other'
      
      for (const [name, weight] of Object.entries(expenseWeights)) {
        cumulativeWeight += weight
        if (randomWeight <= cumulativeWeight) {
          selectedCategoryName = name
          break
        }
      }

      const category = expenseCategories.find(cat => cat.name === selectedCategoryName) || expenseCategories[0]
      
      // 根據類別決定金額範圍（整數）
      let amount = 0
      if (category.name === 'Food') {
        amount = randomInt(50, 500)
      } else if (category.name === 'Transportation') {
        amount = randomInt(20, 200)
      } else if (category.name === 'Entertainment') {
        amount = randomInt(100, 1500) // 減少上限
      } else if (category.name === 'Shopping') {
        amount = randomInt(200, 3000) // 減少上限
      } else if (category.name === 'Healthcare') {
        amount = randomInt(200, 2000) // 減少上限
      } else if (category.name === 'Education') {
        amount = randomInt(100, 1500) // 減少上限
      } else if (category.name === 'Work') {
        amount = randomInt(50, 300)
      } else if (category.name === 'Housing') {
        // 每月一次大額支出
        if (Math.random() < 0.03) { // 約 3% 機率（每月一次）
          amount = randomInt(5000, 12000) // 減少上限
        } else {
          amount = randomInt(100, 1000)
        }
      } else {
        amount = randomInt(50, 500)
      }

      const date = randomDate(day)
      const notes = expenseNotes[category.name] || ['其他']
      
      transactions.push({
        userId: demoUser.id,
        amount: amount, // 已經是整數
        categoryId: category.id,
        typeId: 1,
        date: date,
        note: Math.random() > 0.3 ? randomChoice(notes) : null, // 70% 有備註
      })
      totalExpense += amount
    }
  }

  // 6. 批次插入交易（每次 100 筆）
  console.log(`📊 準備插入 ${transactions.length} 筆交易...`)
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    await prisma.transaction.createMany({
      data: batch,
    })
    inserted += batch.length
    process.stdout.write(`\r進度: ${inserted}/${transactions.length} (${Math.round((inserted / transactions.length) * 100)}%)`)
  }

  console.log('\n✅ 所有交易已插入！\n')

  // 7. 更新用戶餘額
  const balanceChange = totalIncome - totalExpense
  await prisma.user.update({
    where: { id: demoUser.id },
    data: {
      balance: {
        increment: balanceChange,
      },
    },
  })

  // 8. 更新寵物狀態（根據交易）
  if (pet) {
    // 計算寵物狀態變化
    let moodChange = 0
    
    // 收入增加心情
    moodChange += Math.min(30, Math.floor(totalIncome / 1000) * 3)
    
    // 支出減少心情（但不要太多）
    moodChange -= Math.min(20, Math.floor(totalExpense / 500) * 2)
    
    const newMood = Math.max(0, Math.min(100, pet.mood + moodChange))
    
    await prisma.pet.update({
      where: { id: pet.id },
      data: {
        mood: newMood,
        // 飽足感可以稍微增加（因為有記帳習慣）
        fullness: Math.min(100, pet.fullness + 10),
      },
    })
  }

  // 9. 顯示統計資訊
  console.log('📈 生成統計：')
  console.log(`   總交易數：${transactions.length} 筆`)
  console.log(`   總收入：$${totalIncome.toLocaleString()}`)
  console.log(`   總支出：$${totalExpense.toLocaleString()}`)
  console.log(`   淨餘額：$${balanceChange.toLocaleString()}`)
  console.log(`   時間範圍：過去 ${daysBack} 天（約 ${Math.round(daysBack / 30)} 個月）`)
  console.log('\n✅ 完成！demo@example.com 現在有豐富的記帳資料了！')
}

main()
  .catch((e) => {
    console.error('❌ 錯誤：', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

