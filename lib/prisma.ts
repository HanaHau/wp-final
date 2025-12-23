import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimize Prisma Client singleton pattern to ensure proper connection pool management
// Reuse the same instance in all environments to avoid connection pool exhaustion
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 減少日誌輸出以提升效能
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Ensure the same instance is reused in all environments (avoid connection pool exhaustion)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // 在生產環境中也確保重用
  globalForPrisma.prisma = prisma
}

// Gracefully disconnect when application closes
// 注意：在 serverless 環境中，這些事件處理器可能不會被觸發
// 但保留它們以確保在傳統伺服器環境中正確清理
if (typeof window === 'undefined') {
  const cleanup = async () => {
    await prisma.$disconnect()
  }
  
  // 只註冊一次事件處理器
  const handlers = (globalThis as any).__prismaCleanupHandlers
  if (!handlers) {
    (globalThis as any).__prismaCleanupHandlers = true
    
    process.on('beforeExit', cleanup)
    process.on('SIGINT', async () => {
      await cleanup()
      process.exit(0)
    })
    process.on('SIGTERM', async () => {
      await cleanup()
      process.exit(0)
    })
  }
}

