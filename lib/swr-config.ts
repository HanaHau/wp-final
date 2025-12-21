import useSWR, { SWRConfiguration } from 'swr'

// SWR fetcher 函數
export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // @ts-ignore
    error.info = await res.json()
    // @ts-ignore
    error.status = res.status
    throw error
  }
  return res.json()
}

// 全局 SWR 配置
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // 避免窗口聚焦時重新驗證
  revalidateOnReconnect: true, // 網路重連時重新驗證
  dedupingInterval: 5000, // 5 秒內去重相同請求（增加 cache 時間）
  refreshInterval: 0, // 不自動刷新（由組件控制）
  errorRetryCount: 3, // 錯誤重試 3 次
  errorRetryInterval: 5000, // 錯誤重試間隔 5 秒
  // 增加 cache 時間，summary 類資料可以 cache 更久
  keepPreviousData: true, // 保持舊資料直到新資料載入完成
}

// 導出配置好的 useSWR hook
export { useSWR }

