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
        check_pet: { title: '查看寵物狀態', description: '查看你的寵物', target: 1, reward: 5 },
        edit_transaction: { title: '整理帳目(任一編輯)', description: '編輯任何一筆交易', target: 1, reward: 5 },
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

    // 查找或創建 MissionUser 記錄
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

