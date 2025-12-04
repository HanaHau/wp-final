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

export async function GET() {
  try {
    console.log('=== GET /api/missions 開始 ===')
    
    // 獲取當前用戶
    let user
    try {
      user = await getCurrentUser()
      console.log('User from getCurrentUser:', user ? { email: user.email, id: user.id } : 'null')
    } catch (authError) {
      console.error('❌ 獲取用戶失敗:', authError)
      return NextResponse.json({ error: '認證失敗' }, { status: 401 })
    }
    
    if (!user || !user.email) {
      console.log('未授權：沒有用戶或 email')
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 查找用戶記錄
    let userRecord
    try {
      userRecord = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      console.log('User record from DB:', userRecord)
    } catch (dbError) {
      console.error('❌ 查詢用戶失敗:', dbError)
      return NextResponse.json({ error: '資料庫查詢失敗' }, { status: 500 })
    }

    if (!userRecord) {
      console.log('使用者不存在')
      return NextResponse.json({ error: '使用者不存在' }, { status: 404 })
    }

    // 計算日期（確保時區正確）
    const dayStart = getDayStart()
    const weekStart = getWeekStart()
    console.log('Day start:', dayStart.toISOString(), dayStart.getTime())
    console.log('Week start:', weekStart.toISOString(), weekStart.getTime())

    // 獲取所有活躍的任務定義
    let missionDefinitions
    try {
      missionDefinitions = await prisma.mission.findMany({
        where: { active: true },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' },
        ],
      })
      console.log('任務定義數量:', missionDefinitions.length)
    } catch (dbError) {
      console.error('❌ 查詢任務定義失敗:', dbError)
      return NextResponse.json({ error: '查詢任務定義失敗' }, { status: 500 })
    }

    if (!missionDefinitions || missionDefinitions.length === 0) {
      console.warn('⚠️ 沒有找到任何任務定義')
      return NextResponse.json([]) // 返回空數組而不是錯誤
    }

    const missions: any[] = []

    for (const missionDef of missionDefinitions) {
      const periodStart = missionDef.type === 'weekly' ? weekStart : dayStart
      
      // 先嘗試查找當前週期的任務記錄
      let userMission = await prisma.missionUser.findUnique({
        where: {
          userId_missionId_periodStart: {
            userId: userRecord.id,
            missionId: missionDef.id,
            periodStart: periodStart,
          },
        },
      })

      // 如果不存在，創建新的任務記錄
      if (!userMission) {
        try {
          // 直接創建新的任務記錄（使用 upsert 避免並發問題）
          userMission = await prisma.missionUser.upsert({
            where: {
              userId_missionId_periodStart: {
                userId: userRecord.id,
                missionId: missionDef.id,
                periodStart: periodStart,
              },
            },
            update: {}, // 如果已存在，不更新
            create: {
              userId: userRecord.id,
              missionId: missionDef.id,
              periodStart: periodStart,
              progress: 0,
              completed: false,
              claimed: false,
            },
          })
          console.log(`✅ 為用戶創建/獲取任務記錄: ${missionDef.code} (${missionDef.type}, 日期: ${periodStart.toISOString()})`)
        } catch (createError: any) {
          console.error(`❌ 創建任務記錄失敗: ${missionDef.code}`, createError)
          console.error('錯誤詳情:', createError?.message, createError?.code)
          // 如果創建失敗，嘗試再次查找
          try {
            userMission = await prisma.missionUser.findUnique({
              where: {
                userId_missionId_periodStart: {
                  userId: userRecord.id,
                  missionId: missionDef.id,
                  periodStart: periodStart,
                },
              },
            })
          } catch (findError) {
            console.error(`❌ 查找任務記錄也失敗: ${missionDef.code}`, findError)
          }
        }
      } else {
        console.log(`✓ 找到現有任務記錄: ${missionDef.code} (進度: ${userMission.progress}/${missionDef.target})`)
      }

      // 特殊處理：record_5_days 需要實時計算記帳天數
      if (missionDef.type === 'weekly' && missionDef.code === 'record_5_days') {
        const transactions = await prisma.transaction.findMany({
          where: {
            userId: userRecord.id,
            date: {
              gte: weekStart,
            },
          },
          select: { date: true },
        })

        // Count unique days
        const uniqueDays = new Set(
          transactions.map((t) => {
            const d = new Date(t.date)
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          })
        ).size

        console.log(`[record_5_days] 重新計算進度: ${uniqueDays}/${missionDef.target} 天`)

        // Update the userMission with actual progress
        if (userMission && userMission.id) {
          const isCompleted = uniqueDays >= missionDef.target
          await prisma.missionUser.update({
            where: { id: userMission.id },
            data: {
              progress: uniqueDays,
              completed: isCompleted,
              completedAt: isCompleted && !userMission.completed ? new Date() : userMission.completedAt,
            },
          })
          
          // Update the local variable
          userMission.progress = uniqueDays
          userMission.completed = isCompleted
        }
      }

      // 如果仍然沒有找到，使用默認值（不應該發生，但以防萬一）
      if (!userMission) {
        console.warn(`⚠️ 無法獲取或創建任務記錄: ${missionDef.code}，使用默認值`)
        userMission = {
          progress: 0,
          completed: false,
          claimed: false,
        } as any
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

    console.log('用戶任務進度數量:', missions.length)
    console.log('每日任務數量:', missions.filter(m => m.type === 'daily').length)
    console.log('每週任務數量:', missions.filter(m => m.type === 'weekly').length)

    if (missions.length === 0) {
      console.warn('⚠️ 警告：沒有返回任何任務！')
      console.warn('任務定義數量:', missionDefinitions.length)
      console.warn('用戶 ID:', userRecord.id)
    }

    console.log('返回任務數據:', { missionsCount: missions.length, missions })
    return NextResponse.json(missions, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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
        check_pet: { title: '查看寵物狀態', description: '查看你的寵物', target: 1, reward: 5 },
        edit_transaction: { title: '整理帳目(任一編輯)', description: '編輯任何一筆交易', target: 1, reward: 5 },
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

