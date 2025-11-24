import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

async function ensureUserRecord(sessionUser: {
  id?: string
  email?: string | null
  name?: string | null
  image?: string | null
}) {
  if (!sessionUser?.id || !sessionUser.email) {
    return
  }

  await prisma.user.upsert({
    where: { id: sessionUser.id },
    update: {
      name: sessionUser.name ?? undefined,
      image: sessionUser.image ?? undefined,
    },
    create: {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name ?? sessionUser.email.split('@')[0],
      image: sessionUser.image ?? null,
    },
  })
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

