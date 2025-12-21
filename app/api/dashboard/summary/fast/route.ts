import { NextRequest, NextResponse } from 'next/server'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'
import { getDashboardSummaryFast } from '@/lib/dashboard-data'

// 使用 revalidate 快取策略，300 秒內重用相同響應（fast summary 不常變動）
export const revalidate = 300

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

// GET /api/dashboard/summary/fast - 快速返回 dashboard 需要的核心資料（不包含統計）
export async function GET(request: NextRequest) {
  try {
    const summary = await getDashboardSummaryFast()
    
    if (!summary) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addCorsHeaders(response, request)
    }

    const response = NextResponse.json(summary)
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('取得 dashboard summary fast 錯誤:', error)
    const response = NextResponse.json(
      { error: 'Failed to get dashboard summary fast' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}

