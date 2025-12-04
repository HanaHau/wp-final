import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 優化 Prisma Client 單例模式，確保連接池正確管理
// 在所有環境下都重用同一個實例，避免連接池耗盡
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// 確保在所有環境下都重用同一個實例（避免連接池耗盡）
globalForPrisma.prisma = prisma

// 在應用關閉時優雅地斷開連接
if (typeof window === 'undefined') {
  // 僅在服務器端執行
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

