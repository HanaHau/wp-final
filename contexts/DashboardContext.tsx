'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface DashboardSummary {
  monthly?: {
    year: number
    month: number
    totalExpense: number
    totalIncome: number
    dailyStats: Record<string, { expense: number; income: number }>
    transactionCount: number
  }
  pet?: {
    id: string
    name: string
    imageUrl: string | null
    points: number
    fullness: number
    mood: number
    isUnhappy?: boolean
    isHungry?: boolean
    [key: string]: any
  }
  stickers?: Array<{
    id: string
    stickerId: string
    positionX: number
    positionY: number
    rotation: number
    scale: number
    layer: 'floor' | 'wall-left' | 'wall-right'
    imageUrl?: string | null
  }>
  stickerInventory?: Array<{
    stickerId: string
    name: string
    emoji: string
    count: number
    imageUrl?: string | null
  }>
  foodInventory?: Array<{
    itemId: string
    name: string
    emoji: string
    count: number
    imageUrl?: string | null
  }>
  accessories?: Array<{
    id: string
    accessoryId: string
    positionX: number
    positionY: number
    rotation: number
    scale: number
    imageUrl?: string | null
  }>
  accessoryInventory?: Array<{
    accessoryId: string
    name: string
    emoji: string
    count: number
    imageUrl?: string | null
  }>
  unclaimedMissions?: {
    missions: Array<{
      missionId: string
      missionCode: string
      name: string
      points: number
      type: string
    }>
  }
  invitationCount?: {
    count: number
  }
  recentTransactions?: Array<{
    id: string
    amount: number
    category: string
    type: string
    date: string
    note: string | null
    createdAt: string
  }>
  user?: {
    id: string
    email: string
    userID: string | null
    name: string | null
    image: string | null
  }
}

interface DashboardContextType {
  summary: DashboardSummary | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  children,
  summary,
}: {
  children: ReactNode
  summary: DashboardSummary | null
}) {
  const refresh = async () => {
    // This will be implemented when we add SWR
    // For now, it's a placeholder
  }

  return (
    <DashboardContext.Provider
      value={{
        summary,
        isLoading: false,
        error: null,
        refresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

