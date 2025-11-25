import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    if (!pet) {
      return NextResponse.json([])
    }

    // Get all food purchases
    const purchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        category: 'food',
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!purchases.length) {
      return NextResponse.json([])
    }

    const totalByFood: Record<string, number> = {}
    for (const purchase of purchases) {
      totalByFood[purchase.itemId] = (totalByFood[purchase.itemId] || 0) + purchase.quantity
    }

    const foodItems = Object.keys(totalByFood)
      .map((itemId) => {
        const total = totalByFood[itemId] || 0
        if (total <= 0) return null

        const meta = SHOP_ITEM_MAP[itemId]
        if (!meta || meta.category !== 'food') return null

        return {
          itemId,
          name: meta.name,
          emoji: meta.emoji,
          count: total,
        }
      })
      .filter(Boolean)

    return NextResponse.json(foodItems)
  } catch (error) {
    console.error('取得食物庫存失敗:', error)
    return NextResponse.json({ error: '取得食物清單失敗' }, { status: 500 })
  }
}

