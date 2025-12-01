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
        const errorData = await res.json().catch(() => ({ error: '未知錯誤' }))
        throw new Error(errorData.error || '重新開始失敗')
      }

      const data = await res.json()
      
      toast({
        title: '重新開始成功！',
        description: '您的寵物已經復活，請好好照顧牠！',
      })

      setShowRestartDialog(false)
      setPet(data.pet)
      
      // 導航到主畫面
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('重新開始錯誤:', error)
      toast({
        title: '重新開始失敗',
        description: error.message || '請重試',
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
              寵物已死亡
            </h2>
            <p className="text-white/90 text-base mb-6">
              您的寵物因為 {pet.mood <= 0 ? '心情' : '飽食度'} 歸零而死亡
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
              重新開始遊戲
            </Button>
          </div>
        </div>
      )}

      {/* 重新開始對話框 */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="border-2 border-black z-[210]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-wide">
              重新開始遊戲
            </DialogTitle>
            <DialogDescription className="text-sm text-black/60">
              確定要重新開始嗎？這將重置寵物的狀態（points, mood, fullness），但會保留您的收支記錄。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="text-sm">
              <span className="font-semibold">重置項目：</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Points: 50</li>
                <li>Mood: 70</li>
                <li>Fullness: 70</li>
              </ul>
            </div>
            <div className="text-sm">
              <span className="font-semibold">保留項目：</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>收支記錄</li>
                <li>購買記錄</li>
                <li>其他數據</li>
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
              取消
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
              {isRestarting ? '重新開始中...' : '確認重新開始'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

