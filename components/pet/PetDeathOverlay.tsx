'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

export default function PetDeathOverlay() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [pet, setPet] = useState<any>(null)
  const [showRestartDialog, setShowRestartDialog] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  // 檢查寵物狀態
  useEffect(() => {
    if (!session) {
      setIsChecking(false)
      return
    }

    const checkPetStatus = async () => {
      try {
        const res = await fetch('/api/pet')
        if (res.ok) {
          const petData = await res.json()
          setPet(petData)
          
          // 如果寵物死亡，顯示覆蓋層（但不自動打開對話框）
          // 用戶需要點擊按鈕才會打開對話框
        } else if (res.status === 404) {
          // 沒有寵物，不顯示
          setPet(null)
        }
      } catch (error) {
        console.error('檢查寵物狀態失敗:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkPetStatus()
    
    // 每3秒檢查一次寵物狀態
    const interval = setInterval(checkPetStatus, 3000)
    
    return () => clearInterval(interval)
  }, [session])

  // 處理重新開始遊戲
  const handleRestartGame = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    setIsRestarting(true)
    try {
      const res = await fetch('/api/pet/restart', {
        method: 'POST',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Restart failed')
      }

      const data = await res.json()
      
      toast({
        title: 'Restart Successful!',
        description: 'Your pet has been revived. Please take good care of it!',
      })

      setShowRestartDialog(false)
      setPet(data.pet)
      
      // 導航到主畫面
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('重新開始錯誤:', error)
      toast({
        title: 'Restart Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsRestarting(false)
    }
  }

  // 如果正在檢查或沒有寵物，不顯示
  if (isChecking || !pet) {
    return null
  }

  // 如果寵物沒有死亡，不顯示
  const isPetDead = pet && (pet.mood <= 0 || pet.fullness <= 0)
  if (!isPetDead) {
    return null
  }

  return (
    <>
      {/* 死亡覆蓋層 - 全屏 */}
      {!showRestartDialog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex flex-col items-center justify-center gap-4 p-6">
          <div className="text-center max-w-md">
            <div className="text-8xl mb-6 animate-pulse">💀</div>
            <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-wide">
              Pet Has Died
            </h2>
            <p className="text-white/90 text-base mb-6">
              Your pet has died because {pet.mood <= 0 ? 'mood' : 'fullness'} reached zero
            </p>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowRestartDialog(true)
              }}
              className="border-2 border-white bg-white text-black hover:bg-black hover:text-white text-lg px-8 py-6"
              type="button"
            >
              Restart Game
            </Button>
          </div>
        </div>
      )}

      {/* 重新開始對話框 */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="border-2 border-black z-[210]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wide">
              Restart Game
            </DialogTitle>
            <DialogDescription className="text-sm text-black/60">
              Are you sure you want to restart? This will reset your pet&apos;s status (points, mood, fullness), but will keep your transaction records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="text-sm">
              <span className="font-semibold">Reset Items:</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Points: 50</li>
                <li>Mood: 70</li>
                <li>Fullness: 70</li>
              </ul>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Kept Items:</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Transaction records</li>
                <li>Purchase records</li>
                <li>Other data</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowRestartDialog(false)
              }}
              disabled={isRestarting}
              className="border-2 border-black"
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRestartGame(e)
              }}
              disabled={isRestarting}
              className="border-2 border-black bg-black text-white hover:bg-white hover:text-black"
              type="button"
            >
              {isRestarting ? 'Restarting...' : 'Confirm Restart'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

