import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

/**
 * 添加 CORS 標頭到 NextResponse
 * 在 Next.js App Router 中，API 路由通常不需要 CORS，但為了確保兼容性，我們添加這些標頭
 */
export function addCorsHeaders(response: NextResponse, request?: NextRequest): NextResponse {
  // 獲取請求的來源
  const origin = request?.headers.get('origin') || request?.headers.get('referer')
  
  // 如果沒有 origin，可能是同源請求，不需要設置 CORS
  // 如果有 origin，設置 CORS 標頭
  if (origin) {
    // 檢查是否是允許的來源（同一域名或環境變數中指定的域名）
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
    const nextAuthUrl = process.env.NEXTAUTH_URL || ''
    
    // 如果 origin 包含 NEXTAUTH_URL 或是在允許列表中，使用該 origin
    // 否則使用 '*'（允許所有來源，僅用於開發/測試）
    const allowOrigin = allowedOrigins.length > 0 && allowedOrigins.includes(origin)
      ? origin
      : (origin.includes(nextAuthUrl) || !nextAuthUrl)
        ? origin
        : '*'
    
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}

/**
 * 處理 OPTIONS 請求（CORS preflight）
 */
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return addCorsHeaders(response)
}

