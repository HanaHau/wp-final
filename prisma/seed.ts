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

  // 2. 創建任務定義
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

