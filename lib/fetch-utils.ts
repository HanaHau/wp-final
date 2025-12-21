// 請求去重和快取工具：避免同時發送多個相同的請求，並快取響應
const pendingRequests = new Map<string, Promise<any>>()
const responseCache = new Map<string, { data: any; timestamp: number }>()

// 快取過期時間（毫秒）：30 秒（延長快取時間以減少重複請求）
const CACHE_TTL = 30000

/**
 * 帶去重和快取的 fetch 函數
 * 1. 如果相同的 URL 已經有正在進行的請求，會返回同一個 Promise
 * 2. 如果有有效的快取，直接返回快取的數據
 * 3. 優化：只使用 URL 作為 key，忽略 options（因為大部分情況下 options 相同）
 */
export async function deduplicatedFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // 只使用 URL 作為 key，提高去重效果
  const key = url
  
  // 檢查快取（只對 GET 請求使用快取）
  if (!options || options.method === 'GET' || !options.method) {
    const cached = responseCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T
    }
  }
  
  // 如果已經有相同的請求正在進行，返回同一個 Promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }
  
  // 創建新的請求
  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      
      // 只快取 GET 請求的響應
      if (!options || options.method === 'GET' || !options.method) {
        responseCache.set(key, { data, timestamp: Date.now() })
      }
      
      return data
    })
    .finally(() => {
      // 請求完成後從 pendingRequests 中移除
      // 使用 setTimeout 確保在下一個事件循環中移除，避免競態條件
      setTimeout(() => {
        pendingRequests.delete(key)
      }, 0)
    })
  
  pendingRequests.set(key, promise)
  return promise
}

/**
 * 清除指定 URL 的快取（當數據被更新時調用）
 */
export function clearCache(url: string) {
  responseCache.delete(url)
}

/**
 * 清除所有快取
 */
export function clearAllCache() {
  responseCache.clear()
}

