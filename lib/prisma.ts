import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimize Prisma Client singleton pattern to ensure proper connection pool management
// Reuse the same instance in all environments to avoid connection pool exhaustion
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 優化連線池配置以減少連線建立時間
    // 在 Vercel 等 serverless 環境中，這些參數可以幫助減少冷啟動時間
  })

// Ensure the same instance is reused in all environments (avoid connection pool exhaustion)
globalForPrisma.prisma = prisma

// Gracefully disconnect when application closes
if (typeof window === 'undefined') {
  // Only execute on server side
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

