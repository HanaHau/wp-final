import { NextRequest, NextResponse } from 'next/server'
import { addCorsHeaders, handleOptionsRequest } from '@/lib/cors'
import { getDashboardSummary } from '@/lib/dashboard-data'

// 使用 revalidate 快取策略，300 秒內重用相同響應（dashboard summary 不常變動，使用較長的快取時間）
export const revalidate = 300

// 處理 OPTIONS 請求（CORS preflight）
export async function OPTIONS() {
  return handleOptionsRequest()
}

// GET /api/dashboard/summary - 聚合所有 dashboard 需要的資料
export async function GET(request: NextRequest) {
  try {
    const summary = await getDashboardSummary()
    
    if (!summary) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addCorsHeaders(response, request)
    }

    const response = NextResponse.json(summary)
    return addCorsHeaders(response, request)
  } catch (error) {
    console.error('取得 dashboard summary 錯誤:', error)
    const response = NextResponse.json(
      { error: 'Failed to get dashboard summary' },
      { status: 500 }
    )
    return addCorsHeaders(response, request)
  }
}
