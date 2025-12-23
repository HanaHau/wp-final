import FriendsBoard from '@/components/friends/FriendsBoard'

// 優化：移除 Server Component 中的數據獲取
// 讓 FriendsBoard 自行通過 API 獲取數據
// 這樣可以：
// 1. 減少頁面切換延遲
// 2. 利用 SWR 快取
// 3. 顯示載入骨架屏
export default function FriendsPage() {
  // 不再傳入 initialFriends，讓 FriendsBoard 自行獲取
  return <FriendsBoard />
}
