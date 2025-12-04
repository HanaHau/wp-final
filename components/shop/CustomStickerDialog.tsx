'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ImageEditor from '@/components/image/ImageEditor'
import { Plus, Upload, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ShopItemCategory } from '@/data/shop-items'

interface CustomStickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  petPoints?: number
}

const CREATION_COST = 100 // 創建貼紙的固定費用
const PURCHASE_PRICES = [50, 100, 150] as const // 未來購買該貼紙的價格選項

export default function CustomStickerDialog({
  open,
  onOpenChange,
  onSuccess,
  petPoints = 0,
}: CustomStickerDialogProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ShopItemCategory | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<50 | 100 | 150>(100) // 未來購買該貼紙的價格
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type - only allow common image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a JPEG, PNG, GIF, or WebP image file.',
        variant: 'destructive',
      })
      return
    }

    // Check file size - limit to 2MB for better performance
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 2MB. Please compress your image.',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'Failed to read the image file. Please try again.',
        variant: 'destructive',
      })
      setImageFile(null)
      setImagePreview(null)
    }
    reader.onloadend = () => {
      if (reader.result) {
        setImagePreview(reader.result as string)
        setShowImageEditor(true) // Show editor when image is selected
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setShowImageEditor(false)
  }

  const handleImageEditorSave = (editedImageDataUrl: string) => {
    setImagePreview(editedImageDataUrl)
    setShowImageEditor(false)
    // Convert data URL to File
    fetch(editedImageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'edited-sticker.png', { type: 'image/png' })
        setImageFile(file)
      })
      .catch(error => {
        console.error('Error converting edited image to file:', error)
        toast({
          title: 'Error',
          description: 'Failed to process edited image. Please try again.',
          variant: 'destructive',
        })
      })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a sticker name.',
        variant: 'destructive',
      })
      return
    }

    if (!category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive',
      })
      return
    }

    if (!imageFile) {
      toast({
        title: 'Validation Error',
        description: 'Please upload an image.',
        variant: 'destructive',
      })
      return
    }

    if (petPoints < CREATION_COST) {
      toast({
        title: 'Not Enough Points',
        description: `Creating custom stickers costs ${CREATION_COST} points. You have ${petPoints} points.`,
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      // Convert image to base64
      const reader = new FileReader()
      const imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })

      const res = await fetch('/api/custom-stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          imageUrl,
          category,
          price: purchasePrice,
          isPublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg = data.details || data.error || 'Failed to create sticker'
        throw new Error(errorMsg)
      }

      toast({
        title: 'Success',
        description: 'Custom sticker created successfully!',
      })

      // Reset form
      setName('')
      setCategory('')
      setPurchasePrice(100)
      setImageFile(null)
      setImagePreview(null)
      setIsPublic(false)
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create sticker',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Image Editor Modal */}
      {showImageEditor && imagePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <ImageEditor
              imageSrc={imagePreview}
              onSave={handleImageEditorSave}
              onCancel={() => {
                setShowImageEditor(false)
                // Keep the original preview
              }}
              title="Edit Sticker Image"
            />
          </div>
        </div>
      )}

      <Dialog open={open && !showImageEditor} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm uppercase tracking-wide">Make Your Own Sticker</DialogTitle>
          <DialogDescription>
            Upload an image, enter a name, and select a category for your custom sticker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2" style={{ scrollbarWidth: 'thin' }}>
          {/* Image Upload */}
          <div>
            <Label className="text-xs uppercase tracking-wide mb-2 block">Image</Label>
            {imagePreview && !showImageEditor ? (
              <div className="relative rounded-xl border border-black/20 p-4 bg-white/50 backdrop-blur-sm">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={400}
                  height={128}
                  className="w-full h-32 object-contain"
                  unoptimized
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageEditor(true)}
                    className="rounded-xl"
                  >
                    Edit Image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-lg"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/20 p-8 cursor-pointer hover:bg-black/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-xs uppercase tracking-wide">Click to upload</span>
              </label>
            )}
          </div>

          {/* Name Input */}
          <div>
            <Label htmlFor="sticker-name" className="text-xs uppercase tracking-wide mb-2 block">
              Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="sticker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sticker name"
              maxLength={50}
            />
          </div>

          {/* Category Select */}
          <div>
            <Label className="text-xs uppercase tracking-wide mb-2 block">
              Category <span className="text-red-600">*</span>
            </Label>
            <Select value={category} onValueChange={(value) => setCategory(value as ShopItemCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="decoration">Decoration</SelectItem>
                <SelectItem value="accessory">Accessory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Price Select */}
          <div>
            <Label className="text-xs uppercase tracking-wide mb-2 block">
              Future Purchase Price <span className="text-red-600">*</span>
            </Label>
            <Select 
              value={purchasePrice.toString()} 
              onValueChange={(value) => setPurchasePrice(parseInt(value) as 50 | 100 | 150)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 pts</SelectItem>
                <SelectItem value="100">100 pts</SelectItem>
                <SelectItem value="150">150 pts</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-black/60 mt-1">
              This is the price others will pay to purchase this sticker
            </p>
          </div>

          {/* Public Option */}
          <div className="flex items-center gap-2 p-3 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm">
            <input
              type="checkbox"
              id="is-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border border-black/20"
            />
            <Label htmlFor="is-public" className="text-xs uppercase tracking-wide cursor-pointer">
              Make this sticker public (visible to all users)
            </Label>
          </div>

          {/* Cost Display */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-black/20 bg-white/90 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-wide text-black/60">Creation Cost</span>
            <span className="font-bold text-lg">{CREATION_COST} pts</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || petPoints < CREATION_COST}
            className="rounded-xl"
          >
            {uploading
              ? 'Creating...'
              : petPoints < CREATION_COST
                ? `Need ${CREATION_COST} pts`
                : `Create Sticker (${CREATION_COST} pts)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

