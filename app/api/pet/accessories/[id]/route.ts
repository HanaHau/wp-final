import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOrCreatePet(userId: string) {
  let pet = await prisma.pet.findUnique({
    where: { userId },
  })

  if (!pet) {
    const now = new Date()
    pet = await prisma.pet.create({
      data: {
        userId,
        name: '我的寵物',
        points: 0,
        fullness: 70,
        mood: 70,
        lastLoginDate: now,
        lastDailyReset: now,
        consecutiveLoginDays: 0, // 初始連續登入天數為 0
      },
    })
  }

  return pet
}

// DELETE /api/pet/accessories/[id] - Remove accessory (return to inventory)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 從資料庫獲取用戶 ID，因為 session 的 ID 可能不一致
    const userRecord = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!userRecord) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    const pet = await getOrCreatePet(userRecord.id)

    // 優化：在刪除時同時驗證所有權，減少查詢次數
    const deletedAccessory = await prisma.petAccessory.deleteMany({
      where: {
        id: params.id,
        petId: pet.id, // 同時驗證所有權
      },
    })

    if (deletedAccessory.count === 0) {
      return NextResponse.json({ error: 'Accessory not found' }, { status: 404 })
    }

    // 獲取被刪除的配件 ID（用於返回）
    const accessory = await prisma.petAccessory.findUnique({
      where: { id: params.id },
      select: { accessoryId: true },
    }).catch(() => null)

    return NextResponse.json({ 
      success: true, 
      accessoryId: accessory?.accessoryId || null 
    })
  } catch (error) {
    console.error('Delete accessory error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to delete accessory', details: errorMessage },
      { status: 500 }
    )
  }
}

