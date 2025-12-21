'use client'

/**
 * 通用 Skeleton 元件庫
 * 為所有頁面提供統一的 loading 狀態
 */

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-black/20 p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  )
}

export function SkeletonChart({ height = 'h-80' }) {
  return (
    <div className={`bg-white rounded-xl border border-black/20 p-4 animate-pulse ${height}`}>
      <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
      <div className={`${height} bg-gray-100 rounded`} />
    </div>
  )
}

export function SkeletonButton() {
  return <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-24" />
}

export function SkeletonText({ lines = 3, width = 'w-full' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded animate-pulse ${i === lines - 1 ? 'w-2/3' : width}`}
        />
      ))}
    </div>
  )
}

export function SkeletonPageLayout() {
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around p-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-10 h-10 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonTransactionList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-black/20 p-4 animate-pulse flex justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonFriendCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/20 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-black/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
      {/* Pet area */}
      <div className="h-40 bg-gray-100" />
      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded flex-1" />
          <div className="h-8 bg-gray-200 rounded flex-1" />
        </div>
      </div>
      {/* Button */}
      <div className="p-4">
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export function SkeletonMissionPanel() {
  return (
    <div className="fixed left-4 top-20 bottom-24 w-80 bg-white/95 rounded-2xl border border-black/20 shadow-xl animate-pulse">
      <div className="p-4 border-b border-black/20">
        <div className="h-5 bg-gray-200 rounded w-20" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonPetRoom() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[500px] bg-gradient-to-b from-blue-50 to-white rounded-2xl animate-pulse">
      <div className="w-64 h-64 bg-gray-200 rounded-full" />
    </div>
  )
}

