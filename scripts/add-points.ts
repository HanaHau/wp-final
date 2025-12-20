import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addPoints() {
  try {
    // Find user by userID "mmmmmm" (user-defined ID, not the database id)
    const user = await prisma.user.findUnique({
      where: { userID: 'mmmmmm' },
      include: { pet: true },
    })

    if (!user) {
      console.error('User not found with userID: mmmmmm')
      return
    }

    if (!user.pet) {
      console.error('User has no pet')
      return
    }

    // Update pet points to 10000
    const updatedPet = await prisma.pet.update({
      where: { id: user.pet.id },
      data: {
        points: 10000,
      },
    })

    console.log(`Successfully updated pet points to ${updatedPet.points} for user ${user.id}`)
  } catch (error) {
    console.error('Error adding points:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addPoints()

