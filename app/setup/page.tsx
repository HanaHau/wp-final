import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import InitialSetupContent from '@/components/setup/InitialSetupContent'

export default async function SetupPage() {
  const session = await getSession()

  if (!session || !session.user?.email) {
    redirect('/auth/signin')
  }

  // 檢查是否已完成首次設定（使用 email 查找，因為 ID 可能不一致）
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isInitialized: true },
  })

  // 如果已經完成設定，重導向到 dashboard
  if (user?.isInitialized) {
    redirect('/dashboard')
  }

  return <InitialSetupContent />
}

