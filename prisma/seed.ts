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

