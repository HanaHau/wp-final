import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/pet/pet - 撫摸寵物
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Update pet stats (mood +2, cap at 100)
    const moodIncrease = 2 // 直接 +2
    const updatedPet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        mood: Math.min(100, pet.mood + moodIncrease),
        updatedAt: new Date(), // Update interaction time
      },
    })

    // Generate pet message based on mood
    const messages = [
      'Aww, that feels nice! 🥰',
      'I love being petted! 💕',
      'More please! 😊',
      'You\'re the best! ❤️',
      'So happy! 🎉',
    ]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]

    return NextResponse.json({
      pet: updatedPet,
      message: randomMessage,
      moodGain: moodIncrease,
    })
  } catch (error) {
    console.error('Pet pet error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to pet', details: errorMessage },
      { status: 500 }
    )
  }
}

