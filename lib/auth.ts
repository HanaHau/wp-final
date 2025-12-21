import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

async function ensureUserRecord(sessionUser: {
  id?: string
  email?: string | null
  name?: string | null
  image?: string | null
}) {
  if (!sessionUser?.email) {
    return null
  }

  // Use email as the unique identifier since it's consistent across auth methods
  // First, try to find existing user by email
  const existingUser = await prisma.user.findUnique({
    where: { email: sessionUser.email },
  })

  if (existingUser) {
    // 優化：只在真正需要更新時才執行更新查詢
    // 檢查是否需要更新（避免不必要的資料庫寫入）
    const needsImageUpdate = sessionUser.image && existingUser.image !== sessionUser.image
    const needsNameUpdate = !existingUser.name && sessionUser.name
    
    if (needsImageUpdate || needsNameUpdate) {
      const updateData: any = {}
      if (needsImageUpdate) {
        updateData.image = sessionUser.image
      }
      if (needsNameUpdate) {
        updateData.name = sessionUser.name
      }
      
      const updated = await prisma.user.update({
        where: { email: sessionUser.email },
        data: updateData,
      })
      return updated
    }
    return existingUser
  } else {
    // Create new user - let Prisma generate the ID to avoid conflicts
    const created = await prisma.user.create({
      data: {
        email: sessionUser.email,
        name: sessionUser.name ?? sessionUser.email.split('@')[0],
        image: sessionUser.image ?? null,
      },
    })
    return created
  }
}

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) {
    return null
  }

  await ensureUserRecord(session.user)
  return session.user
}

// 獲取當前用戶的資料庫記錄（包含 ID）
export async function getCurrentUserRecord() {
  const session = await getSession()
  if (!session?.user?.email) {
    return null
  }

  const userRecord = await ensureUserRecord(session.user)
  return userRecord
}

export async function checkInitialization() {
  // 優化：直接使用 getCurrentUserRecord，避免重複查詢
  const userRecord = await getCurrentUserRecord()
  if (!userRecord) {
    return { isInitialized: false, hasCompletedTutorial: false, user: null }
  }

  // 直接使用 userRecord，不需要再次查詢
  return {
    isInitialized: userRecord.isInitialized ?? false,
    hasCompletedTutorial: userRecord.hasCompletedTutorial ?? false,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      image: userRecord.image,
    },
  }
}

