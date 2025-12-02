import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 在開發模式下，強制清除舊的實例以確保使用最新的 Prisma Client
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  // 檢查是否有 mission 模型
  if (!('mission' in globalForPrisma.prisma)) {
    console.log('🔄 清除舊的 Prisma Client 實例（缺少 mission 模型）')
    // 嘗試斷開連接（異步，但不等待）
    globalForPrisma.prisma.$disconnect().catch(() => {
      // 忽略錯誤
    })
    globalForPrisma.prisma = undefined
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 驗證 mission 模型存在
if (!('mission' in prisma)) {
  console.error('⚠️ Prisma Client 缺少 mission 模型！')
  console.error('請運行: npx prisma generate')
  console.error('然後重啟開發伺服器')
  console.error('如果問題持續，請清除 .next 緩存: rm -rf .next')
} else {
  console.log('✅ Prisma Client 已正確載入 mission 模型')
}

