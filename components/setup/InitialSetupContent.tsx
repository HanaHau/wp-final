'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Upload, X, Edit } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import ImageEditor from './ImageEditor'

type FacingDirection = 'left' | 'right'

export default function InitialSetupContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [userID, setUserID] = useState<string>('')
  const [petName, setPetName] = useState<string>('My Pet')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [rawImageForEditing, setRawImageForEditing] = useState<string | null>(null)
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
        title: 'Invalid File Type',
        description: 'Please select a JPEG, PNG, GIF, or WebP image file.',
        variant: 'destructive',
      })
      return
    }

    // 檢查檔案大小 - 限制 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be smaller than 2MB. Please compress your image.',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Unable to read image file. Please try again.',
        variant: 'destructive',
      })
      setImageFile(null)
      setImagePreview(null)
      setEditedImageUrl(null)
      setRawImageForEditing(null)
    }
    reader.onloadend = () => {
      if (reader.result) {
        const dataUrl = reader.result as string
        setRawImageForEditing(dataUrl)
        setImagePreview(dataUrl)
        setEditedImageUrl(null)
        // Automatically open editor
        setShowImageEditor(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setEditedImageUrl(null)
    setRawImageForEditing(null)
  }

  const handleImageEditorSave = (editedUrl: string) => {
    setEditedImageUrl(editedUrl)
    setImagePreview(editedUrl)
    setShowImageEditor(false)
    toast({
      title: 'Edit Complete',
      description: 'Your selected area has been saved',
    })
  }

  const handleImageEditorCancel = () => {
    setShowImageEditor(false)
  }

  const handleEditImage = () => {
    if (rawImageForEditing) {
      setShowImageEditor(true)
    }
  }

  const handleSubmit = async () => {
    if (!userID.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a userID.',
        variant: 'destructive',
      })
      return
    }

    if (userID.length > 50) {
      toast({
        title: 'Validation Error',
        description: 'userID length cannot exceed 50 characters.',
        variant: 'destructive',
      })
      return
    }

    if (!petName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a pet name.',
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

      // 如果有上傳圖片，使用編輯後的版本或原始版本
      if (imageFile) {
        if (editedImageUrl) {
          petImageUrl = editedImageUrl
        } else {
          const reader = new FileReader()
          petImageUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string)
              } else {
                reject(new Error('Unable to read image'))
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(imageFile)
          })
        }
      }

      const requestBody = {
        userID: userID.trim(),
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API error response:', errorData)
        const errorMessage = errorData.error || errorData.details || 'Setup failed'
        // If userID duplicate error, handle specially
        if (errorMessage.includes('userID') || errorMessage.includes('already') || errorMessage.includes('taken')) {
          toast({
            title: 'userID Already Taken',
            description: errorMessage,
            variant: 'destructive',
          })
          setIsSubmitting(false)
          return
        }
        throw new Error(errorMessage)
      }

      toast({
        title: 'Setup Complete!',
        description: 'Welcome to Pet Accounting App!',
      })

      // 重導向到 dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('設定錯誤:', error)
      toast({
        title: 'Setup Failed',
        description: error.message || 'Please try again',
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
            Welcome to Pet Accounting App
          </CardTitle>
          <p className="text-sm text-black/60 text-center mt-2">
            Please complete the following setup to get started
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* UserID 設定 */}
          <div>
            <Label htmlFor="userID" className="text-sm uppercase tracking-wide text-black/60">
              UserID <span className="text-red-600">*</span>
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              Please enter your userID (max 50 characters). This ID must be unique. If it's already taken, please choose another ID.
            </p>
            <Input
              id="userID"
              type="text"
              value={userID}
              onChange={(e) => setUserID(e.target.value)}
              placeholder="Enter your userID"
              className="mt-2"
              maxLength={50}
              required
            />
          </div>

          {/* 寵物名稱 */}
          <div>
            <Label htmlFor="petName" className="text-sm uppercase tracking-wide text-black/60">
              Pet Name
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              Give your pet a name! You can change it later in the settings page.
            </p>
            <Input
              id="petName"
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="My Pet"
              className="mt-2"
              maxLength={20}
            />
          </div>

          {/* 寵物照片上傳 */}
          <div>
            <Label htmlFor="petImage" className="text-sm uppercase tracking-wide text-black/60">
              Pet Photo (Optional)
            </Label>
            <p className="text-xs text-black/40 mt-1 mb-2">
              Upload your pet photo. If not uploaded, the default image will be used. After uploading, you can use the brush tool to select areas to keep. Once selected, it cannot be changed. To change, you need to restart.
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1">
                <Input
                  id="petImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {imageFile && rawImageForEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditImage}
                    className="border-2 border-black"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="border-2 border-black"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 寵物朝向選擇 */}
          {(imageFile || previewImage !== '/cat.png') && (
            <div>
              <Label className="text-sm uppercase tracking-wide text-black/60">
                Pet Facing Direction
              </Label>
              <p className="text-xs text-black/40 mt-1 mb-2">
                Please select the direction your pet's head is facing in the uploaded image. This will determine how your pet appears when moving in the room. (If the image is front-facing or has no specific direction, just pick any direction)
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
                  Left
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
                  Right
                </button>
              </div>
            </div>
          )}

          {/* 預覽 */}
          <div>
            <Label className="text-sm uppercase tracking-wide text-black/60">
              Preview
            </Label>
            <div className="mt-2 flex justify-center">
              <div className="relative w-48 h-48 border-2 border-black rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={previewImage}
                  alt="Pet Preview"
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
            {isSubmitting ? 'Setting up...' : 'Confirm Setup'}
          </Button>
        </CardContent>
      </Card>

      {/* 確認對話框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="border-2 border-black">
          <DialogHeader>
            <DialogTitle>Confirm Setup</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete the setup? Once confirmed, the pet photo cannot be changed. To change the pet, you need to restart.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="text-sm">
              <span className="font-semibold">UserID：</span>
              <span>{userID.trim() || 'Not set'}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Pet Name: </span>
              <span>{petName.trim() || 'Not set'}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Pet Photo: </span>
              <span>{imageFile ? 'Uploaded' : 'Using default image'}</span>
            </div>
            {(imageFile || previewImage !== '/cat.png') && (
              <div className="text-sm">
                <span className="font-semibold">Pet Facing: </span>
                <span>{facingDirection === 'left' ? 'Left' : 'Right'}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="border-2 border-black"
            >
              {isSubmitting ? 'Setting up...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Editor */}
      {showImageEditor && rawImageForEditing && (
        <ImageEditor
          imageUrl={rawImageForEditing}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
        />
      )}
    </div>
  )
}

