import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. 創建 Type
  console.log('Creating types...')
  await prisma.type.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: '支出',
    },
  })

  await prisma.type.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: '收入',
    },
  })

  await prisma.type.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: '存錢',
    },
  })

  // 2. 創建預設的「其他」類別（每個 type 一個）
  console.log('Creating default "其他" categories...')
  
  // 2. 創建預設的「其他」類別（每個 type 一個，sort_order = 0）
  console.log('Creating default "其他" categories...')
  
  // 支出的「其他」- 設置為 8，排在所有預設類別最後
  const otherExpense = await prisma.category.findFirst({
    where: {
      userId: null,
      typeId: 1,
      name: '其他',
      isDefault: true,
    },
  })
  if (!otherExpense) {
    await prisma.category.create({
      data: {
        id: 'default-other-expense',
        name: '其他',
        typeId: 1,
        userId: null,
        isDefault: true,
        sortOrder: 8, // 排在所有預設類別最後
        icon: '📝',
      },
    })
  } else if (otherExpense.sortOrder !== 8) {
    await prisma.category.update({
      where: { id: otherExpense.id },
      data: { sortOrder: 8 },
    })
  }

  // 收入的「其他」- 設置為 8
  const otherIncome = await prisma.category.findFirst({
    where: {
      userId: null,
      typeId: 2,
      name: '其他',
      isDefault: true,
    },
  })
  if (!otherIncome) {
    await prisma.category.create({
      data: {
        id: 'default-other-income',
        name: '其他',
        typeId: 2,
        userId: null,
        isDefault: true,
        sortOrder: 8,
        icon: '📝',
      },
    })
  } else if (otherIncome.sortOrder !== 8) {
    await prisma.category.update({
      where: { id: otherIncome.id },
      data: { sortOrder: 8 },
    })
  }

  // 存錢的「其他」- 設置為 8
  const otherDeposit = await prisma.category.findFirst({
    where: {
      userId: null,
      typeId: 3,
      name: '其他',
      isDefault: true,
    },
  })
  if (!otherDeposit) {
    await prisma.category.create({
      data: {
        id: 'default-other-deposit',
        name: '其他',
        typeId: 3,
        userId: null,
        isDefault: true,
        sortOrder: 8,
        icon: '📝',
      },
    })
  } else if (otherDeposit.sortOrder !== 8) {
    await prisma.category.update({
      where: { id: otherDeposit.id },
      data: { sortOrder: 8 },
    })
  }

  // 3. 創建其他預設類別（8個，sort_order 1-8）
  console.log('Creating other default categories...')
  
  const defaultExpenseCategories = [
    { name: '飲食', icon: '🍔', sortOrder: 1 },
    { name: '交通', icon: '🚗', sortOrder: 2 },
    { name: '娛樂', icon: '🎮', sortOrder: 3 },
    { name: '購物', icon: '🛍️', sortOrder: 4 },
    { name: '醫療', icon: '🏥', sortOrder: 5 },
    { name: '教育', icon: '📚', sortOrder: 6 },
    { name: '水電', icon: '💡', sortOrder: 7 },
    // 通訊已刪除，只保留 7 個預設類別 + 1 個「其他」= 8 個
  ]

  for (const cat of defaultExpenseCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        typeId: 1,
        name: cat.name,
      },
    })
    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          typeId: 1,
          userId: null,
          isDefault: false,
          sortOrder: cat.sortOrder,
          icon: cat.icon,
        },
      })
    } else if (existing.sortOrder !== cat.sortOrder) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { sortOrder: cat.sortOrder },
      })
    }
  }

  // 4. 創建任務定義
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
    { code: 'record_transaction', title: '今日記帳1筆', description: '記錄一筆交易', target: 1, reward: 10 },
    { code: 'check_pet', title: '查看寵物狀態', description: '查看你的寵物', target: 1, reward: 5 },
    { code: 'edit_transaction', title: '整理帳目(任一編輯)', description: '編輯任何一筆交易', target: 1, reward: 5 },
    { code: 'visit_friend', title: '拜訪1位好友', description: '拜訪一位好友', target: 1, reward: 5 },
    { code: 'pet_friend', title: '摸摸好友寵物', description: '與好友的寵物互動', target: 1, reward: 5 },
  ]

  const weeklyMissions = [
    { code: 'record_5_days', title: '本週記帳達5天', description: '本週記帳達到5天', target: 5, reward: 40 },
    { code: 'interact_3_friends', title: '與3位好友互動', description: '與3位不同的好友互動', target: 3, reward: 30 },
  ]

  // 創建每日任務定義
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

  // 創建每週任務定義
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

  // 5. 為所有現有用戶創建當前的每日和每週任務
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
      
      // 檢查是否已存在
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

