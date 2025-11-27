'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

type FacingDirection = 'left' | 'right'

export default function InitialSetupContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [initialBalance, setInitialBalance] = useState<string>('0')
  const [petName, setPetName] = useState<string>('我的寵物')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('right')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 檢查檔案類型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: '檔案類型錯誤',
        description: '請選擇 JPEG、PNG、GIF 或 WebP 圖片檔案。',
        variant: 'destructive',
      })
      return
    }

    // 檢查檔案大小 - 限制 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '檔案過大',
        description: '圖片必須小於 2MB，請壓縮您的圖片。',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onerror = () => {
      toast({
        title: '讀取檔案錯誤',
        description: '無法讀取圖片檔案，請重試。',
        variant: 'destructive',
      })
      setImageFile(null)
      setImagePreview(null)
    }
    reader.onloadend = () => {
      if (reader.result) {
        setImagePreview(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async () => {
    const balance = parseFloat(initialBalance)
    
    if (isNaN(balance) || balance < 0) {
      toast({
        title: '驗證錯誤',
        description: '請輸入有效的初始餘額（必須大於或等於 0）。',
        variant: 'destructive',
      })
      return
    }

    if (!petName.trim()) {
      toast({
        title: '驗證錯誤',
        description: '請輸入寵物名稱。',
        variant: 'destructive',
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const handleConfirm = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)

    try {
      let petImageUrl: string | null = null

      // 如果有上傳圖片，轉換為 base64
      if (imageFile) {
        const reader = new FileReader()
        petImageUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string)
            } else {
              reject(new Error('無法讀取圖片'))
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
      }

      const requestBody = {
        initialBalance: parseFloat(initialBalance),
        petName: petName.trim(),
        petImageUrl,
        facingDirection,
      }

      console.log('發送設定請求:', requestBody)

      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
        console.error('API 錯誤回應:', errorData)
        throw new Error(errorData.error || errorData.details || '設定失敗')
      }

      toast({
        title: '設定完成！',
        description: '歡迎使用寵物記帳 APP！',
      })

      // 重導向到 dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('設定錯誤:', error)
      toast({
        title: '設定失敗',
        description: error.message || '請重試',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewImage = imagePreview || '/cat.png'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-black">
        <CardHeader>
          <CardTitle className="text-2xl font-bold uppercase tracking-wide text-center">
            歡迎使用寵物記帳 APP
          </CardTitle>
          <p className="text-sm text-black/60 text-center mt-2">
            請完成以下設定以開始使用
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 初始餘額設定 */}
          <div>
            <Label htmlFor="initialBalance" className="text-sm uppercase tracking-wide text-black/60">
              初始帳戶餘額
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              這是您的帳戶餘額，與寵物點數不同。寵物點數是透過「存錢」功能獲得的。
            </p>
            <Input
              id="initialBalance"
              type="number"
              min="0"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="mt-2"
            />
          </div>

          {/* 寵物名稱 */}
          <div>
            <Label htmlFor="petName" className="text-sm uppercase tracking-wide text-black/60">
              寵物名稱
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              為您的寵物取一個名字吧！之後可以在設定頁面中更改。
            </p>
            <Input
              id="petName"
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="我的寵物"
              className="mt-2"
              maxLength={20}
            />
          </div>

          {/* 寵物照片上傳 */}
          <div>
            <Label htmlFor="petImage" className="text-sm uppercase tracking-wide text-black/60">
              寵物照片（選填）
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              上傳您的寵物照片。若不上傳，將使用預設圖片。選擇後無法更改，若要更改需要重新飼養。
            </p>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1">
                <Input
                  id="petImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {imageFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="border-2 border-black"
                >
                  <X className="h-4 w-4 mr-1" />
                  移除
                </Button>
              )}
            </div>
          </div>

          {/* 寵物朝向選擇 */}
          {(imageFile || previewImage !== '/cat.png') && (
            <div>
              <Label className="text-sm uppercase tracking-wide text-black/60">
                寵物朝向
              </Label>
              <p className="text-xs text-black/40 mt-1 mb-2">
                請選擇您上傳的圖片中，寵物頭部朝向的方向。這將用於決定寵物在房間中移動時的顯示方式。（如果圖片是正面，或沒有特定朝向，就隨便選一個方向）
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setFacingDirection('left')}
                  className={`flex-1 border-2 border-black px-4 py-2 text-sm font-semibold transition-colors ${
                    facingDirection === 'left'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-black/10'
                  }`}
                >
                  朝左
                </button>
                <button
                  type="button"
                  onClick={() => setFacingDirection('right')}
                  className={`flex-1 border-2 border-black px-4 py-2 text-sm font-semibold transition-colors ${
                    facingDirection === 'right'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-black/10'
                  }`}
                >
                  朝右
                </button>
              </div>
            </div>
          )}

          {/* 預覽 */}
          <div>
            <Label className="text-sm uppercase tracking-wide text-black/60">
              預覽
            </Label>
            <div className="mt-2 flex justify-center">
              <div className="relative w-48 h-48 border-2 border-black rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={previewImage}
                  alt="寵物預覽"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* 確認按鈕 */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full border-2 border-black"
          >
            {isSubmitting ? '設定中...' : '確認設定'}
          </Button>
        </CardContent>
      </Card>

      {/* 確認對話框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="border-2 border-black">
          <DialogHeader>
            <DialogTitle>確認設定</DialogTitle>
            <DialogDescription>
              確定要完成設定嗎？一旦確認後，寵物照片將無法更改。若要更改寵物，需要重新飼養。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="text-sm">
              <span className="font-semibold">初始餘額：</span>
              <span>{parseFloat(initialBalance).toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">寵物名稱：</span>
              <span>{petName.trim() || '未設定'}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">寵物照片：</span>
              <span>{imageFile ? '已上傳' : '使用預設圖片'}</span>
            </div>
            {(imageFile || previewImage !== '/cat.png') && (
              <div className="text-sm">
                <span className="font-semibold">寵物朝向：</span>
                <span>{facingDirection === 'left' ? '朝左' : '朝右'}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-2 border-black"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="border-2 border-black"
            >
              {isSubmitting ? '設定中...' : '確認'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

