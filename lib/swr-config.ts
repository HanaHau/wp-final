import useSWR, { SWRConfiguration } from 'swr'

// SWR fetcher 函數 - 優化版本
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    // 添加快取控制
    headers: {
      'Cache-Control': 'max-age=30, stale-while-revalidate=60',
    },
  })
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // @ts-ignore
    error.info = await res.json().catch(() => ({}))
    // @ts-ignore
    error.status = res.status
    throw error
  }
  return res.json()
}

// 全局 SWR 配置 - 優化版本
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // 避免窗口聚焦時重新驗證
  revalidateOnReconnect: true, // 網路重連時重新驗證
  dedupingInterval: 10000, // 10 秒內去重相同請求（增加去重時間）
  focusThrottleInterval: 10000, // 聚焦時 10 秒內最多驗證一次
  refreshInterval: 0, // 不自動刷新（由組件控制）
  errorRetryCount: 2, // 錯誤重試 2 次（減少重試次數以加快失敗響應）
  errorRetryInterval: 3000, // 錯誤重試間隔 3 秒
  keepPreviousData: true, // 保持舊資料直到新資料載入完成
  revalidateIfStale: false, // 不自動重新驗證過期資料（由組件控制）
  // 使用 suspense 模式可以提升首次載入體驗（可選）
  // suspense: true,
}

// 導出配置好的 useSWR hook
export { useSWR }

