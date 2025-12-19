import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TutorialContent from '@/components/tutorial/TutorialContent'

export default async function TutorialPage() {
  const session = await getSession()

  if (!session || !session.user?.email) {
    redirect('/auth/signin')
  }

  // Get user with pet data
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      isInitialized: true,
      hasCompletedTutorial: true,
      pet: {
        select: {
          name: true,
          imageUrl: true,
          facingDirection: true,
        }
      }
    },
  })

  // If not initialized, redirect to setup
  if (!user?.isInitialized) {
    redirect('/setup')
  }

  // If already completed tutorial, redirect to dashboard
  if (user?.hasCompletedTutorial) {
    redirect('/dashboard')
  }

  return <TutorialContent pet={user.pet} />
}

