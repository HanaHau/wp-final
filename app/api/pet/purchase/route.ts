import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

const purchaseSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
})

// POST /api/pet/purchase - 寵物購買物品
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = purchaseSchema.parse(body)
    
    let item: { id: string; name: string; cost: number; category: string } | null = null
    
    // Check if it's a custom sticker
    if (validatedData.itemId.startsWith('custom-')) {
      const customStickerId = validatedData.itemId.replace('custom-', '')
      const customSticker = await prisma.customSticker.findUnique({
        where: { id: customStickerId },
      })
      
      // Allow purchase if sticker exists and (is owned by user OR is public)
      if (!customSticker || (!customSticker.isPublic && customSticker.userId !== user.id)) {
        return NextResponse.json({ error: '找不到商品' }, { status: 404 })
      }
      
      item = {
        id: validatedData.itemId,
        name: customSticker.name,
        cost: customSticker.price, // 使用貼紙設定的價格
        category: customSticker.category,
      }
    } else {
      // Regular shop item
      item = SHOP_ITEM_MAP[validatedData.itemId]
      if (!item) {
        return NextResponse.json({ error: '找不到商品' }, { status: 404 })
      }
    }

    const pet = await prisma.pet.findUnique({
      where: { userId: user.id },
    })

    if (!pet) {
      return NextResponse.json({ error: '找不到寵物' }, { status: 404 })
    }

    const totalCost = item.cost * validatedData.quantity

    if (pet.points < totalCost) {
      return NextResponse.json(
        { error: '點數不足' },
        { status: 400 }
      )
    }

    // 扣除點數並記錄購買
    // 每購買一個飾品或食物 +3 mood（無上限次數）
    const moodIncrease = (item.category === 'accessory' || item.category === 'food') 
      ? validatedData.quantity * 3  // 每個物品 +3
      : 0  // 其他類別（如 decoration）不增加 mood
    
    const updateData: {
      points: { decrement: number }
      mood?: { increment: number }
    } = {
      points: {
        decrement: totalCost,
      },
    }
    
    if (moodIncrease > 0) {
      updateData.mood = {
        increment: Math.min(100 - pet.mood, moodIncrease), // 確保不超過 100
      }
    }
    
    const [updatedPet, purchase] = await prisma.$transaction([
      prisma.pet.update({
        where: { id: pet.id },
        data: updateData,
      }),
      prisma.petPurchase.create({
        data: {
          petId: pet.id,
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          cost: totalCost,
          quantity: validatedData.quantity,
        },
      }),
    ])

    return NextResponse.json({ pet: updatedPet, purchase }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }
    console.error('購買物品錯誤:', error)
    return NextResponse.json({ error: '購買物品失敗' }, { status: 500 })
  }
}

