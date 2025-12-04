import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Type
  console.log('Creating types...')
  await prisma.type.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Expense',
    },
  })

  await prisma.type.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Income',
    },
  })

  await prisma.type.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Deposit',
    },
  })

  // 2. Create mission definitions
  console.log('Creating mission definitions...')
  
  const getWeekStart = (date: Date = new Date()): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(d.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }

  const getDayStart = (date: Date = new Date()): Date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const dailyMissions = [
    { code: 'record_transaction', title: 'Record 1 Transaction Today', description: 'Record one transaction', target: 1, reward: 10 },
    { code: 'visit_friend', title: 'Visit 1 Friend', description: 'Visit one friend', target: 1, reward: 5 },
    { code: 'pet_friend', title: 'Pet Friend\'s Pet', description: 'Interact with a friend\'s pet', target: 1, reward: 5 },
  ]

  const weeklyMissions = [
    { code: 'record_5_days', title: 'Record Transactions for 5 Days This Week', description: 'Record transactions for 5 days this week', target: 5, reward: 40 },
    { code: 'interact_3_friends', title: 'Interact with 3 Friends', description: 'Interact with 3 different friends', target: 3, reward: 30 },
  ]

  // Create daily mission definitions
  for (const mission of dailyMissions) {
    await prisma.mission.upsert({
      where: { code: mission.code },
      update: {
        title: mission.title,
        description: mission.description,
        target: mission.target,
        reward: mission.reward,
        type: 'daily',
        active: true,
      },
      create: {
        code: mission.code,
        title: mission.title,
        description: mission.description,
        type: 'daily',
        target: mission.target,
        reward: mission.reward,
        active: true,
      },
    })
  }

  // Create weekly mission definitions
  for (const mission of weeklyMissions) {
    await prisma.mission.upsert({
      where: { code: mission.code },
      update: {
        title: mission.title,
        description: mission.description,
        target: mission.target,
        reward: mission.reward,
        type: 'weekly',
        active: true,
      },
      create: {
        code: mission.code,
        title: mission.title,
        description: mission.description,
        type: 'weekly',
        target: mission.target,
        reward: mission.reward,
        active: true,
      },
    })
  }

  console.log('✅ Mission definitions created!')

  // 3. Create default categories
  console.log('Creating default categories...')
  
  // Default Expense Categories (typeId = 1)
  const defaultExpenseCategories = [
    { name: 'Food', icon: '🍔', sortOrder: 1 },
    { name: 'Transportation', icon: '🚗', sortOrder: 2 },
    { name: 'Entertainment', icon: '🎮', sortOrder: 3 },
    { name: 'Shopping', icon: '🛍️', sortOrder: 4 },
    { name: 'Healthcare', icon: '🏥', sortOrder: 5 },
    { name: 'Education', icon: '📚', sortOrder: 6 },
    { name: 'Work', icon: '💼', sortOrder: 7 },
    { name: 'Housing', icon: '🏠', sortOrder: 8 },
    { name: 'Other', icon: '📝', sortOrder: 9, isDefault: true },
  ]

  // Default Income Categories (typeId = 2)
  const defaultIncomeCategories = [
    { name: 'Salary', icon: '💼', sortOrder: 1 },
    { name: 'Bonus', icon: '🎁', sortOrder: 2 },
    { name: 'Investment', icon: '📈', sortOrder: 3 },
    { name: 'Gift', icon: '🎁', sortOrder: 4 },
    { name: 'Other', icon: '📝', sortOrder: 5, isDefault: true },
  ]

  // Create or update expense categories
  for (const cat of defaultExpenseCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        typeId: 1,
        name: cat.name,
      },
    })

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isDefault: cat.isDefault || false,
        },
      })
    } else {
      await prisma.category.create({
        data: {
          name: cat.name,
          typeId: 1,
          userId: null,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isDefault: cat.isDefault || false,
        },
      })
    }
  }

  // Create or update income categories
  for (const cat of defaultIncomeCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        typeId: 2,
        name: cat.name,
      },
    })

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isDefault: cat.isDefault || false,
        },
      })
    } else {
      await prisma.category.create({
        data: {
          name: cat.name,
          typeId: 2,
          userId: null,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isDefault: cat.isDefault || false,
        },
      })
    }
  }

  // Update existing Chinese category names to English (if they exist)
  const chineseToEnglishMap: Record<string, string> = {
    // Expense categories
    '食物': 'Food',
    '交通': 'Transportation',
    '娛樂': 'Entertainment',
    '購物': 'Shopping',
    '醫療': 'Healthcare',
    '教育': 'Education',
    '工作': 'Work',
    '住房': 'Housing',
    '其他': 'Other',
    // Income categories
    '薪資': 'Salary',
    '獎金': 'Bonus',
    '投資': 'Investment',
    '禮物': 'Gift',
  }

  for (const [chineseName, englishName] of Object.entries(chineseToEnglishMap)) {
    // Find categories with Chinese names (default categories only, userId = null)
    const chineseCategories = await prisma.category.findMany({
      where: {
        name: chineseName,
        userId: null,
      },
    })

    for (const cat of chineseCategories) {
      // Check if English category already exists
      const englishCategory = await prisma.category.findFirst({
        where: {
          name: englishName,
          typeId: cat.typeId,
          userId: null,
        },
      })

      if (!englishCategory) {
        // Update Chinese name to English
        await prisma.category.update({
          where: { id: cat.id },
          data: { name: englishName },
        })
        console.log(`Updated category: ${chineseName} -> ${englishName}`)
      } else {
        // If English category exists, we need to migrate transactions
        // First, update all transactions using the Chinese category to use English category
        await prisma.transaction.updateMany({
          where: { categoryId: cat.id },
          data: { categoryId: englishCategory.id },
        })
        // Then delete the Chinese category
        await prisma.category.delete({
          where: { id: cat.id },
        })
        console.log(`Migrated transactions and deleted duplicate category: ${chineseName} -> ${englishName}`)
      }
    }
  }

  console.log('✅ Default categories created/updated!')

  // 4. Create current daily and weekly missions for all existing users
  console.log('Creating user missions for existing users...')
  
  const allUsers = await prisma.user.findMany({
    select: { id: true },
  })

  const dayStart = getDayStart()
  const weekStart = getWeekStart()

  const allMissionDefs = await prisma.mission.findMany({
    where: { active: true },
  })

  let createdCount = 0
  for (const user of allUsers) {
    for (const missionDef of allMissionDefs) {
      const periodStart = missionDef.type === 'weekly' ? weekStart : dayStart
      
      // Check if already exists
      const existing = await prisma.missionUser.findUnique({
        where: {
          userId_missionId_periodStart: {
            userId: user.id,
            missionId: missionDef.id,
            periodStart: periodStart,
          },
        },
      })

      if (!existing) {
        await prisma.missionUser.create({
          data: {
            userId: user.id,
            missionId: missionDef.id,
            periodStart: periodStart,
            progress: 0,
            completed: false,
            claimed: false,
          },
        })
        createdCount++
      }
    }
  }

  console.log(`✅ Created ${createdCount} user mission records for ${allUsers.length} users!`)

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

