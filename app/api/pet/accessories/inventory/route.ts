import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SHOP_ITEM_MAP } from '@/data/shop-items'

export const dynamic = 'force-dynamic'

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

    // Get all accessory purchases
    const purchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        category: 'accessory',
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!purchases.length) {
      // Still check for custom accessories
      const customPurchases = await prisma.petPurchase.findMany({
        where: {
          petId: pet.id,
          itemId: { startsWith: 'custom-' },
        },
        select: {
          itemId: true,
          quantity: true,
        },
      })

      if (!customPurchases.length) {
        return NextResponse.json([])
      }

      const customAccessoryIds = customPurchases.map((p) => p.itemId.replace('custom-', ''))
      
      const customAccessories = await prisma.customSticker.findMany({
        where: {
          id: { in: customAccessoryIds },
          category: 'accessory',
        },
      })

      const customAccessoryMap = new Map(customAccessories.map((cs) => [cs.id, cs]))

      const customTotalByAccessory: Record<string, number> = {}
      for (const purchase of customPurchases) {
        customTotalByAccessory[purchase.itemId] = (customTotalByAccessory[purchase.itemId] || 0) + purchase.quantity
      }

      const customAccessoryItemIds = customPurchases.map((p) => p.itemId)
      const customPlacedCountsRaw = customAccessoryItemIds.length
        ? await prisma.petAccessory.groupBy({
            by: ['accessoryId'],
            _count: true,
            where: {
              petId: pet.id,
              accessoryId: { in: customAccessoryItemIds },
            },
          })
        : []

      const customPlacedCounts: Record<string, number> = {}
      for (const item of customPlacedCountsRaw) {
        customPlacedCounts[item.accessoryId] = item._count
      }

      const processedAccessoryIds = new Set<string>()
      const customAvailable: Array<{ accessoryId: string; name: string; emoji: string; imageUrl: string; count: number }> = []
      
      for (const purchase of customPurchases) {
        const accessoryId = purchase.itemId
        
        if (processedAccessoryIds.has(accessoryId)) continue
        processedAccessoryIds.add(accessoryId)
        
        const customAccessoryId = accessoryId.replace('custom-', '')
        const customAccessory = customAccessoryMap.get(customAccessoryId)
        
        if (!customAccessory) continue
        
        const total = customTotalByAccessory[accessoryId] || 0
        const placed = customPlacedCounts[accessoryId] || 0
        const remaining = total - placed
        if (remaining <= 0) continue

        customAvailable.push({
          accessoryId,
          name: customAccessory.name,
          emoji: '🖼️',
          imageUrl: customAccessory.imageUrl,
          count: remaining,
        })
      }

      return NextResponse.json([...customAvailable])
    }

    const totalByAccessory: Record<string, number> = {}
    for (const purchase of purchases) {
      totalByAccessory[purchase.itemId] = (totalByAccessory[purchase.itemId] || 0) + purchase.quantity
    }

    const accessoryIds = Object.keys(totalByAccessory)

    const placedCountsRaw = accessoryIds.length
      ? await prisma.petAccessory.groupBy({
          by: ['accessoryId'],
          _count: true,
          where: {
            petId: pet.id,
            accessoryId: { in: accessoryIds },
          },
        })
      : []

    const placedCounts: Record<string, number> = {}
    for (const item of placedCountsRaw) {
      placedCounts[item.accessoryId] = item._count
    }

    const available = accessoryIds
      .filter((accessoryId) => !accessoryId.startsWith('custom-'))
      .map((accessoryId) => {
        const total = totalByAccessory[accessoryId] || 0
        const placed = placedCounts[accessoryId] || 0
        const remaining = total - placed
        if (remaining <= 0) return null

        const meta = SHOP_ITEM_MAP[accessoryId]
        return {
          accessoryId,
          name: meta?.name ?? 'Accessory',
          emoji: meta?.emoji ?? '🎀',
          count: remaining,
        }
      })
      .filter(Boolean)

    // Get custom accessory purchases
    const customPurchases = await prisma.petPurchase.findMany({
      where: {
        petId: pet.id,
        itemId: { startsWith: 'custom-' },
      },
      select: {
        itemId: true,
        quantity: true,
      },
    })

    if (!customPurchases.length) {
      return NextResponse.json([...available])
    }

    const customAccessoryIds = customPurchases.map((p) => p.itemId.replace('custom-', ''))
    
    const customAccessories = await prisma.customSticker.findMany({
      where: {
        id: { in: customAccessoryIds },
        category: 'accessory',
      },
    })

    const customAccessoryMap = new Map(customAccessories.map((cs) => [cs.id, cs]))

    const customTotalByAccessory: Record<string, number> = {}
    for (const purchase of customPurchases) {
      customTotalByAccessory[purchase.itemId] = (customTotalByAccessory[purchase.itemId] || 0) + purchase.quantity
    }

    const customAccessoryItemIds = customPurchases.map((p) => p.itemId)
    const customPlacedCountsRaw = customAccessoryItemIds.length
      ? await prisma.petAccessory.groupBy({
          by: ['accessoryId'],
          _count: true,
          where: {
            petId: pet.id,
            accessoryId: { in: customAccessoryItemIds },
          },
        })
      : []

    const customPlacedCounts: Record<string, number> = {}
    for (const item of customPlacedCountsRaw) {
      customPlacedCounts[item.accessoryId] = item._count
    }

    const processedAccessoryIds = new Set<string>()
    const customAvailable: Array<{ accessoryId: string; name: string; emoji: string; imageUrl: string; count: number }> = []
    
    for (const purchase of customPurchases) {
      const accessoryId = purchase.itemId
      
      if (processedAccessoryIds.has(accessoryId)) continue
      processedAccessoryIds.add(accessoryId)
      
      const customAccessoryId = accessoryId.replace('custom-', '')
      const customAccessory = customAccessoryMap.get(customAccessoryId)
      
      if (!customAccessory) continue
      
      const total = customTotalByAccessory[accessoryId] || 0
      const placed = customPlacedCounts[accessoryId] || 0
      const remaining = total - placed
      if (remaining <= 0) continue

      customAvailable.push({
        accessoryId,
        name: customAccessory.name,
        emoji: '🖼️',
        imageUrl: customAccessory.imageUrl,
        count: remaining,
      })
    }

    return NextResponse.json([...available, ...customAvailable])
  } catch (error) {
    console.error('取得可用配件失敗:', error)
    return NextResponse.json({ error: '取得配件清單失敗' }, { status: 500 })
  }
}

