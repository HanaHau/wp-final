import { prisma } from './prisma'

const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

export async function updateMissionProgress(
  userId: string,
  type: 'daily' | 'weekly',
  missionId: string,
  progress: number = 1
) {
  try {
    const weekStart = type === 'weekly' ? getWeekStart() : null

    const whereClause: any = {
      userId,
      type,
      missionId,
    }

    if (type === 'weekly') {
      whereClause.weekStart = weekStart
    } else {
      whereClause.weekStart = null
    }

    const existing = await prisma.mission.findFirst({
      where: whereClause,
    })

    if (existing) {
      const newProgress = existing.progress + progress
      const target = existing.target
      const isCompleted = newProgress >= target

      await prisma.mission.update({
        where: { id: existing.id },
        data: {
          progress: newProgress,
          completed: isCompleted || existing.completed,
          completedAt: isCompleted && !existing.completed ? new Date() : existing.completedAt,
          updatedAt: new Date(),
        },
      })
    } else {
      const target = type === 'daily' ? 1 : (missionId === 'record_5_days' ? 5 : 3)
      const isCompleted = progress >= target

      await prisma.mission.create({
        data: {
          userId,
          type,
          missionId,
          progress,
          target,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
          weekStart: type === 'weekly' ? weekStart : null,
        },
      })
    }
  } catch (error) {
    console.error('Update mission progress error:', error)
    // 不拋出錯誤，避免影響主要功能
  }
}

