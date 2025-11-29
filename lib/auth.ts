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
    return
  }

  // Use email as the unique identifier since it's consistent across auth methods
  // First, try to find existing user by email
  const existingUser = await prisma.user.findUnique({
    where: { email: sessionUser.email },
  })

  if (existingUser) {
    // Update existing user if needed
    await prisma.user.update({
      where: { email: sessionUser.email },
      data: {
        name: sessionUser.name ?? existingUser.name,
        image: sessionUser.image ?? existingUser.image,
      },
    })
  } else {
    // Create new user - let Prisma generate the ID to avoid conflicts
    await prisma.user.create({
      data: {
        email: sessionUser.email,
        name: sessionUser.name ?? sessionUser.email.split('@')[0],
        image: sessionUser.image ?? null,
      },
    })
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

export async function checkInitialization() {
  const user = await getCurrentUser()
  if (!user || !user.email) {
    return { isInitialized: false, user: null }
  }

  // Find user by email since ID might not match between session and database
  const userRecord = await prisma.user.findUnique({
    where: { email: user.email },
    select: { isInitialized: true, id: true },
  })

  // Update session user ID to match database ID
  if (userRecord && user.id !== userRecord.id) {
    user.id = userRecord.id
  }

  return {
    isInitialized: userRecord?.isInitialized ?? false,
    user,
  }
}

