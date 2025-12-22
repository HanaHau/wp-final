import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 重置 demo@example.com 為初始狀態...\n')

  // 1. 找到用戶
  const user = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
    include: {
      pet: true,
    },
  })

  if (!user) {
    console.log('❌ 找不到 demo@example.com 用戶')
    return
  }

  console.log('✅ 找到用戶：', user.name || user.email)

  // 2. 刪除所有交易紀錄
  const transactionCount = await prisma.transaction.count({
    where: { userId: user.id },
  })

  if (transactionCount > 0) {
    console.log(`🗑️  刪除 ${transactionCount} 筆交易紀錄...`)
    await prisma.transaction.deleteMany({
      where: { userId: user.id },
    })
    console.log('✅ 交易紀錄已刪除\n')
  } else {
    console.log('ℹ️  沒有交易紀錄需要刪除\n')
  }

  // 3. 刪除用戶上傳的自訂貼紙
  const customStickerCount = await prisma.customSticker.count({
    where: { userId: user.id },
  })

  if (customStickerCount > 0) {
    console.log(`🗑️  刪除 ${customStickerCount} 個自訂貼紙...`)
    await prisma.customSticker.deleteMany({
      where: { userId: user.id },
    })
    console.log('✅ 自訂貼紙已刪除\n')
  } else {
    console.log('ℹ️  沒有自訂貼紙需要刪除\n')
  }

  // 4. 重置用戶餘額
  console.log('💰 重置用戶餘額為 0...')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: 0,
    },
  })
  console.log('✅ 餘額已重置\n')

  // 5. 刪除房間裝飾（RoomSticker）
  if (user.pet) {
    const roomStickerCount = await prisma.roomSticker.count({
      where: { petId: user.pet.id },
    })

    if (roomStickerCount > 0) {
      console.log(`🗑️  刪除 ${roomStickerCount} 個房間裝飾...`)
      await prisma.roomSticker.deleteMany({
        where: { petId: user.pet.id },
      })
      console.log('✅ 房間裝飾已刪除\n')
    } else {
      console.log('ℹ️  沒有房間裝飾需要刪除\n')
    }
  }

  // 6. 刪除倉庫中的 decor（PetPurchase）
  if (user.pet) {
    const purchaseCount = await prisma.petPurchase.count({
      where: { 
        petId: user.pet.id,
        category: 'decoration', // 只刪除 decoration 類別的購買記錄
      },
    })

    if (purchaseCount > 0) {
      console.log(`🗑️  刪除 ${purchaseCount} 筆倉庫中的 decor 購買記錄...`)
      await prisma.petPurchase.deleteMany({
        where: { 
          petId: user.pet.id,
          category: 'decoration',
        },
      })
      console.log('✅ 倉庫中的 decor 已刪除\n')
    } else {
      console.log('ℹ️  沒有倉庫中的 decor 需要刪除\n')
    }
  }

  // 7. 刪除寵物身上的 accessory（PetAccessory）
  if (user.pet) {
    const accessoryCount = await prisma.petAccessory.count({
      where: { petId: user.pet.id },
    })

    if (accessoryCount > 0) {
      console.log(`🗑️  刪除 ${accessoryCount} 個寵物身上的 accessory...`)
      await prisma.petAccessory.deleteMany({
        where: { petId: user.pet.id },
      })
      console.log('✅ 寵物身上的 accessory 已刪除\n')
    } else {
      console.log('ℹ️  沒有寵物身上的 accessory 需要刪除\n')
    }
  }

  // 8. 刪除倉庫中的 accessory（PetPurchase）
  if (user.pet) {
    const accessoryPurchaseCount = await prisma.petPurchase.count({
      where: { 
        petId: user.pet.id,
        category: 'accessory', // 刪除 accessory 類別的購買記錄
      },
    })

    if (accessoryPurchaseCount > 0) {
      console.log(`🗑️  刪除 ${accessoryPurchaseCount} 筆倉庫中的 accessory 購買記錄...`)
      await prisma.petPurchase.deleteMany({
        where: { 
          petId: user.pet.id,
          category: 'accessory',
        },
      })
      console.log('✅ 倉庫中的 accessory 已刪除\n')
    } else {
      console.log('ℹ️  沒有倉庫中的 accessory 需要刪除\n')
    }
  }

  // 9. 刪除所有任務記錄（MissionUser）
  const missionUserCount = await prisma.missionUser.count({
    where: { userId: user.id },
  })

  if (missionUserCount > 0) {
    console.log(`🗑️  刪除 ${missionUserCount} 筆任務記錄...`)
    await prisma.missionUser.deleteMany({
      where: { userId: user.id },
    })
    console.log('✅ 任務記錄已刪除\n')
  } else {
    console.log('ℹ️  沒有任務記錄需要刪除\n')
  }

  // 10. 重置寵物狀態
  if (user.pet) {
    console.log('🐾 重置寵物狀態...')
    await prisma.pet.update({
      where: { id: user.pet.id },
      data: {
        mood: 70,
        fullness: 70,
        points: 500,
      },
    })
    console.log('✅ 寵物狀態已重置：')
    console.log('   - mood: 70')
    console.log('   - fullness: 70')
    console.log('   - points: 500\n')
  } else {
    // 如果沒有寵物，創建一個
    console.log('🐾 創建寵物...')
    await prisma.pet.create({
      data: {
        userId: user.id,
        name: 'My Pet',
        mood: 70,
        fullness: 70,
        points: 500,
      },
    })
    console.log('✅ 寵物已創建並設定為初始狀態\n')
  }

  // 11. 驗證結果
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      pet: true,
      transactions: true,
    },
  })

  console.log('📊 重置結果：')
  console.log(`   餘額：$${updatedUser?.balance || 0}`)
  console.log(`   交易數：${updatedUser?.transactions.length || 0} 筆`)
  if (updatedUser?.pet) {
    console.log(`   寵物心情：${updatedUser.pet.mood}`)
    console.log(`   寵物飽足感：${updatedUser.pet.fullness}`)
    console.log(`   寵物點數：${updatedUser.pet.points}`)
  }
  console.log('\n✅ 重置完成！demo@example.com 已恢復為初始狀態')
}

main()
  .catch((e) => {
    console.error('❌ 錯誤：', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

