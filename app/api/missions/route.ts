import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 獲取當前用戶
    let user
    try {
      user = await getCurrentUser()
    } catch (authError) {
      console.error('❌ 獲取用戶失敗:', authError)
      return NextResponse.json({ error: '認證失敗' }, { status: 401 })
    }
    
    if (!user || !user.email) {
      console.log('未授權：沒有用戶或 email')
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 計算日期（確保時區正確）- 提前計算，不依賴數據庫查詢
    const dayStart = getDayStart()
    const weekStart = getWeekStart()

    // 並行執行：查找用戶記錄和獲取任務定義（加速首次載入）
    const [userRecord, missionDefinitions] = await Promise.all([
      prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      }),
      prisma.mission.findMany({
        where: { active: true },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' },
        ],
      }),
    ])

    if (!userRecord) {
      console.log('使用者不存在')
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    if (!missionDefinitions || missionDefinitions.length === 0) {
      console.warn('⚠️ 沒有找到任何任務定義')
      return NextResponse.json([]) // 返回空數組而不是錯誤
    }

    // 過濾掉已移除的任務
    const activeMissionDefinitions = missionDefinitions.filter(
      (def) => def.code !== 'edit_transaction' && def.code !== 'check_pet'
    )

    // 一次性查詢所有相關的 userMission 記錄（優化 N+1 查詢問題）
    const missionIds = activeMissionDefinitions.map((def) => def.id)
    const periodStarts = [dayStart, weekStart]
    
    const userMissions = await prisma.missionUser.findMany({
      where: {
        userId: userRecord.id,
        missionId: { in: missionIds },
        periodStart: { in: periodStarts },
      },
    })

    // 創建一個 Map 以便快速查找 userMission
    const userMissionMap = new Map<string, typeof userMissions[0]>()
    for (const um of userMissions) {
      const key = `${um.missionId}_${um.periodStart.getTime()}`
      userMissionMap.set(key, um)
    }

    const missions: any[] = []

    // 批量創建缺失的任務記錄
    const missionsToCreate: Array<{
      userId: string
      missionId: string
      periodStart: Date
      progress: number
      completed: boolean
      claimed: boolean
    }> = []

    for (const missionDef of activeMissionDefinitions) {
      const periodStart = missionDef.type === 'weekly' ? weekStart : dayStart
      const key = `${missionDef.id}_${periodStart.getTime()}`
      let userMission = userMissionMap.get(key)

      if (!userMission) {
        // 準備創建新記錄
        missionsToCreate.push({
          userId: userRecord.id,
          missionId: missionDef.id,
          periodStart: periodStart,
          progress: 0,
          completed: false,
          claimed: false,
        })
      }
    }

    // 處理 record_5_days 特殊任務（需要實時計算）- 並行執行以加速
    const record5DaysDef = activeMissionDefinitions.find(
      (def) => def.type === 'weekly' && def.code === 'record_5_days'
    )
    
    // 並行執行：批量創建和 record_5_days 計算（加速首次載入）
    const [createdMissions, record5DaysResult] = await Promise.all([
      // 批量創建缺失的任務記錄（使用事務批量處理）
      missionsToCreate.length > 0
        ? prisma.$transaction(
            missionsToCreate.map((data) =>
              prisma.missionUser.upsert({
                where: {
                  userId_missionId_periodStart: {
                    userId: data.userId,
                    missionId: data.missionId,
                    periodStart: data.periodStart,
                  },
                },
                update: {},
                create: data,
              })
            ),
            { timeout: 10000 } // 10秒超時
          ).catch((createError: any) => {
            console.error('❌ 批量創建任務記錄失敗:', createError)
            return []
          })
        : Promise.resolve([]),
      
      // record_5_days 計算（如果存在）- 並行執行
      record5DaysDef
        ? (async () => {
            try {
              const transactions = await prisma.transaction.findMany({
                where: {
                  userId: userRecord.id,
                  date: { gte: weekStart },
                },
                select: { date: true },
              })

              const uniqueDays = new Set(
                transactions.map((t) => {
                  const d = new Date(t.date)
                  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                })
              ).size

              const key = `${record5DaysDef.id}_${weekStart.getTime()}`
              const userMission = userMissionMap.get(key)
              
              if (userMission) {
                const isCompleted = uniqueDays >= record5DaysDef.target
                const updated = await prisma.missionUser.update({
                  where: { id: userMission.id },
                  data: {
                    progress: uniqueDays,
                    completed: isCompleted,
                    completedAt: isCompleted && !userMission.completed ? new Date() : userMission.completedAt,
                  },
                })
                
                return { key, updated }
              }
              return null
            } catch (error) {
              console.error('❌ record_5_days 計算失敗:', error)
              return null
            }
          })()
        : Promise.resolve(null),
    ])
    
    // 將新創建的記錄加入 Map
    for (const created of createdMissions) {
      const key = `${created.missionId}_${created.periodStart.getTime()}`
      userMissionMap.set(key, created)
    }
    
    // 更新 record_5_days 的 Map 記錄
    if (record5DaysResult) {
      userMissionMap.set(record5DaysResult.key, record5DaysResult.updated)
    }
    
    if (createdMissions.length > 0) {
      console.log(`✅ 批量創建 ${createdMissions.length} 個任務記錄`)
    }

    // 構建 missions 數組
    for (const missionDef of activeMissionDefinitions) {
      const periodStart = missionDef.type === 'weekly' ? weekStart : dayStart
      const key = `${missionDef.id}_${periodStart.getTime()}`
      const userMission = userMissionMap.get(key)

      // 如果仍然沒有找到，使用默認值（不應該發生，但以防萬一）
      if (!userMission) {
        console.warn(`⚠️ 無法獲取或創建任務記錄: ${missionDef.code}，使用默認值`)
        missions.push({
          type: missionDef.type,
          missionId: missionDef.code, // 保持向後兼容
          missionCode: missionDef.code,
          name: missionDef.title,
          points: missionDef.reward,
          progress: 0,
          target: missionDef.target,
          completed: false,
          claimed: false,
          weekStart: missionDef.type === 'weekly' ? weekStart.toISOString() : undefined,
        })
        continue
      }

      missions.push({
        type: missionDef.type,
        missionId: missionDef.code, // 保持向後兼容
        missionCode: missionDef.code,
        name: missionDef.title,
        points: missionDef.reward,
        progress: userMission.progress,
        target: missionDef.target,
        completed: userMission.completed,
        claimed: userMission.claimed,
        weekStart: missionDef.type === 'weekly' ? weekStart.toISOString() : undefined,
      })
    }

    return NextResponse.json(missions, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate', // 確保數據是最新的
      },
    }) // 直接返回數組，不是對象
  } catch (error) {
    console.error('❌ Get missions error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // 返回更詳細的錯誤信息（僅在開發環境）
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({ 
      error: '取得任務失敗',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { type, missionCode, missionId, progress = 1 } = body

    // 支持 missionId 和 missionCode（向後兼容）
    const code = missionCode || missionId

    if (!code || !type) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    const periodStart = type === 'weekly' ? getWeekStart() : getDayStart()

    // 確保 Mission 定義存在
    let missionDef = await prisma.mission.findUnique({
      where: { code },
    })

    if (!missionDef) {
      // 如果不存在，創建任務定義（這裡應該有任務配置）
      const missionConfig: Record<string, { title: string; description: string; target: number; reward: number }> = {
        record_transaction: { title: '今日記帳1筆', description: '記錄一筆交易', target: 1, reward: 10 },
        visit_friend: { title: '拜訪1位好友', description: '拜訪一位好友', target: 1, reward: 5 },
        pet_friend: { title: '摸摸好友寵物', description: '與好友的寵物互動', target: 1, reward: 5 },
        record_5_days: { title: '本週記帳達5天', description: '本週記帳達到5天', target: 5, reward: 40 },
        interact_3_friends: { title: '與3位好友互動', description: '與3位不同的好友互動', target: 3, reward: 30 },
      }

      const config = missionConfig[code]
      if (!config) {
        return NextResponse.json({ error: '未知的任務代碼' }, { status: 400 })
      }

      missionDef = await prisma.mission.create({
        data: {
          code,
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
    if (type === 'weekly' && code === 'record_5_days') {
      const weekStart = getWeekStart()
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userRecord.id,
          date: {
            gte: weekStart,
          },
        },
        select: { date: true },
      })

      const uniqueDays = new Set(
        transactions.map((t) => {
          const d = new Date(t.date)
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        })
      ).size

      const existing = await prisma.missionUser.findUnique({
        where: {
          userId_missionId_periodStart: {
            userId: userRecord.id,
            missionId: missionDef.id,
            periodStart: weekStart,
          },
        },
      })

      let userMission
      if (existing) {
        userMission = await prisma.missionUser.update({
          where: { id: existing.id },
          data: {
            progress: uniqueDays,
            completed: uniqueDays >= missionDef.target,
            completedAt: uniqueDays >= missionDef.target && !existing.completed ? new Date() : existing.completedAt,
          },
        })
      } else {
        userMission = await prisma.missionUser.create({
          data: {
            userId: userRecord.id,
            missionId: missionDef.id,
            periodStart: weekStart,
            progress: uniqueDays,
            completed: uniqueDays >= missionDef.target,
            completedAt: uniqueDays >= missionDef.target ? new Date() : null,
          },
        })
      }

      const isCompleted = userMission.completed && !userMission.claimed

      return NextResponse.json({ 
        mission: {
          ...userMission,
          missionCode: missionDef.code,
          missionId: missionDef.code, // 向後兼容
          name: missionDef.title,
          points: missionDef.reward,
          target: missionDef.target,
        },
        completed: isCompleted,
      })
    }

    // 一般任務處理
    const existing = await prisma.missionUser.findUnique({
      where: {
        userId_missionId_periodStart: {
          userId: userRecord.id,
          missionId: missionDef.id,
          periodStart: periodStart,
        },
      },
    })

    let userMission
    if (existing) {
      const newProgress = existing.progress + progress
      const isCompleted = newProgress >= missionDef.target
      
      userMission = await prisma.missionUser.update({
        where: { id: existing.id },
        data: {
          progress: newProgress,
          completed: isCompleted || existing.completed,
          completedAt: isCompleted && !existing.completed ? new Date() : existing.completedAt,
        },
      })
    } else {
      const isCompleted = progress >= missionDef.target
      
      userMission = await prisma.missionUser.create({
        data: {
          userId: userRecord.id,
          missionId: missionDef.id,
          periodStart: periodStart,
          progress,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      })
    }

    const isCompleted = userMission.completed && !userMission.claimed

    return NextResponse.json({ 
      mission: {
        ...userMission,
        missionCode: missionDef.code,
        missionId: missionDef.code, // 向後兼容
        name: missionDef.title,
        points: missionDef.reward,
        target: missionDef.target,
      },
      completed: isCompleted,
      progress: userMission.progress,
      target: missionDef.target,
    })
  } catch (error) {
    console.error('Update mission error:', error)
    return NextResponse.json({ error: '更新任務失敗' }, { status: 500 })
  }
}

