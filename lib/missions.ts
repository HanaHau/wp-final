import { prisma } from './prisma'

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

export interface MissionCompletedInfo {
  missionId: string
  missionCode: string
  name: string
  points: number
  type: 'daily' | 'weekly'
}

export async function updateMissionProgress(
  userId: string,
  type: 'daily' | 'weekly',
  missionCode: string,
  progress: number = 1
): Promise<MissionCompletedInfo | null> {
  try {
    // 計算 periodStart
    const periodStart = type === 'weekly' ? getWeekStart() : getDayStart()

    // 確保 Mission 定義存在
    let mission = await prisma.mission.findUnique({
      where: { code: missionCode },
    })

    if (!mission) {
      // 如果 Mission 不存在，根據 missionCode 創建（這裡需要任務定義的映射）
      const missionConfig: Record<string, { title: string; description: string; target: number; reward: number }> = {
        record_transaction: { title: '今日記帳1筆', description: '記錄一筆交易', target: 1, reward: 10 },
        visit_friend: { title: '拜訪1位好友', description: '拜訪一位好友', target: 1, reward: 5 },
        pet_friend: { title: '摸摸好友寵物', description: '與好友的寵物互動', target: 1, reward: 5 },
        record_5_days: { title: '本週記帳達5天', description: '本週記帳達到5天', target: 5, reward: 40 },
        interact_3_friends: { title: '與3位好友互動', description: '與3位不同的好友互動', target: 3, reward: 30 },
      }

      const config = missionConfig[missionCode]
      if (!config) {
        console.error(`Unknown mission code: ${missionCode}`)
        return null
      }

      mission = await prisma.mission.create({
        data: {
          code: missionCode,
          title: config.title,
          description: config.description,
          type,
          target: config.target,
          reward: config.reward,
          active: true,
        },
      })
    }

    // 特殊處理：record_5_days 需要計算實際記帳天數
    if (type === 'weekly' && missionCode === 'record_5_days') {
      const weekStart = getWeekStart()
      console.log('[record_5_days] Week start:', weekStart.toISOString(), weekStart.toLocaleDateString())
      
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userId,
          date: {
            gte: weekStart,
          },
        },
        select: { date: true },
      })
      console.log('[record_5_days] Total transactions this week:', transactions.length)

      // Count unique days
      const uniqueDays = new Set(
        transactions.map((t) => {
          const d = new Date(t.date)
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        })
      ).size
      console.log('[record_5_days] Unique days:', uniqueDays, 'Target:', mission.target)

      const existing = await prisma.missionUser.findUnique({
        where: {
          userId_missionId_periodStart: {
            userId: userId,
            missionId: mission.id,
            periodStart: weekStart,
          },
        },
      })

      let wasCompletedBefore = false
      let isNewlyCompleted = false

      if (existing) {
        wasCompletedBefore = existing.completed
        const isCompleted = uniqueDays >= mission.target
        isNewlyCompleted = isCompleted && !wasCompletedBefore

        await prisma.missionUser.update({
          where: { id: existing.id },
          data: {
            progress: uniqueDays,
            completed: isCompleted,
            completedAt: isCompleted && !existing.completed ? new Date() : existing.completedAt,
          },
        })
      } else {
        const isCompleted = uniqueDays >= mission.target
        isNewlyCompleted = isCompleted

        await prisma.missionUser.create({
          data: {
            userId: userId,
            missionId: mission.id,
            periodStart: weekStart,
            progress: uniqueDays,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        })
      }

      // 如果任務剛完成，返回任務完成信息
      if (isNewlyCompleted) {
        return {
          missionId: mission.id,
          missionCode: mission.code,
          name: mission.title,
          points: mission.reward,
          type: mission.type as 'daily' | 'weekly',
        }
      }

      return null
    }

    // 一般任務處理
    const existing = await prisma.missionUser.findUnique({
      where: {
        userId_missionId_periodStart: {
          userId,
          missionId: mission.id,
          periodStart: periodStart,
        },
      },
    })

    let wasCompletedBefore = false
    let isNewlyCompleted = false

    if (existing) {
      wasCompletedBefore = existing.completed
      const newProgress = existing.progress + progress
      const isCompleted = newProgress >= mission.target
      isNewlyCompleted = isCompleted && !wasCompletedBefore

      await prisma.missionUser.update({
        where: { id: existing.id },
        data: {
          progress: newProgress,
          completed: isCompleted || existing.completed,
          completedAt: isCompleted && !existing.completed ? new Date() : existing.completedAt,
        },
      })
    } else {
      const isCompleted = progress >= mission.target
      isNewlyCompleted = isCompleted

      await prisma.missionUser.create({
        data: {
          userId,
          missionId: mission.id,
          periodStart: periodStart,
          progress,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      })
    }

    // 如果任務剛完成（之前未完成，現在完成了），返回任務完成信息
    if (isNewlyCompleted) {
      return {
        missionId: mission.id,
        missionCode: mission.code,
        name: mission.title,
        points: mission.reward,
        type: mission.type as 'daily' | 'weekly',
      }
    }

    return null
  } catch (error) {
    console.error('Update mission progress error:', error)
    // 不拋出錯誤，避免影響主要功能
    return null
  }
}

