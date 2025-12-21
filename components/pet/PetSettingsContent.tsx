'use client'

import { useEffect, useState, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PetDisplay from './PetDisplay'
import Navigation from '@/components/dashboard/Navigation'
import ImageEditor from '@/components/image/ImageEditor'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Upload, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { useSWR } from '@/lib/swr-config'
import { DashboardContext } from '@/contexts/DashboardContext'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
}

interface Purchase {
  id: string
  itemId: string
  itemName: string
  cost: number
  quantity: number
  purchasedAt: string
}

interface PetAccessory {
  id: string
  accessoryId: string
  positionX: number
  positionY: number
  rotation: number
  scale: number
  imageUrl?: string | null
}

interface AvailableAccessory {
  accessoryId: string
  name: string
  emoji: string
  count: number
  imageUrl?: string
}

export default function PetSettingsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [petName, setPetName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  // 嘗試從 context 獲取 pet 資料
  const dashboardContext = useContext(DashboardContext)
  const contextPet = dashboardContext?.summary?.pet

  // 使用 SWR 獲取 pet 和 accessories
  const { data: petData, error: petError, mutate: mutatePet } = useSWR('/api/pet')
  const { data: accessoriesData, mutate: mutateAccessories } = useSWR('/api/pet/accessories')

  // 優先使用 context 的 pet，否則使用 SWR 的 pet
  const pet = contextPet || petData || null
  const accessories = accessoriesData || []
  const purchases = pet?.purchases || []
  const loading = !pet && !petError && !contextPet

  // 當 pet 資料載入後，更新 petName
  useEffect(() => {
    if (pet) {
      setPetName(pet.name)
    }
  }, [pet])


  const removeBackground = async (file: File): Promise<string> => {
    try {
      // Use @imgly/background-removal for client-side background removal
      const { removeBackground } = await import('@imgly/background-removal')
      
      const blob = await removeBackground(file)
      const reader = new FileReader()
      
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Background removal failed:', error)
      // Fallback to original image if removal fails
      const reader = new FileReader()
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
  }

  const handleImageEditorSave = (editedImageDataUrl: string) => {
    setImagePreview(editedImageDataUrl)
    setShowImageEditor(false)
    // Convert data URL to File for background removal
    fetch(editedImageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'edited-image.png', { type: 'image/png' })
        setImageFile(file)
      })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let imageUrl = pet?.imageUrl

      // If image file is uploaded, remove background and convert to data URL
      if (imageFile) {
        try {
          // If we have an edited preview, use it directly (already processed)
          if (imagePreview && imagePreview.startsWith('data:image/png')) {
            imageUrl = imagePreview
          } else {
            // Otherwise, apply background removal
            imageUrl = await removeBackground(imageFile)
          }
        } catch (error) {
          console.error('Background removal error:', error)
          // Fallback: use preview if available, otherwise convert to data URL
          if (imagePreview) {
            imageUrl = imagePreview
          } else {
            const reader = new FileReader()
            imageUrl = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(imageFile)
            })
          }
        }
      }

      const res = await fetch('/api/pet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: petName,
          imageUrl,
        }),
      })

      if (!res.ok) throw new Error('Update failed')

      // 使用 SWR mutate 刷新資料
      mutatePet()
      toast({
        title: 'Success',
        description: 'Pet updated successfully',
      })
    } catch (error) {
      console.error('Update error:', error)
      alert('Update failed, please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, accessoryId: string, count: number) => {
    if (count <= 0) {
      event.preventDefault()
      return
    }
    // Set data similar to how food drag works - use type to distinguish
    const dragData = { type: 'accessory', accessoryId }
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    event.dataTransfer.effectAllowed = 'copy'
    console.log('Drag started:', dragData)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const data = event.dataTransfer.getData('application/json')
    if (!data) {
      return
    }

    let accessoryId: string | null = null
    try {
      const parsed = JSON.parse(data)
      // Check if it's an accessory (similar to how food is checked)
      if (parsed.type === 'accessory') {
        accessoryId = parsed.accessoryId
      } else if (parsed.accessoryId) {
        // Fallback for old format
        accessoryId = parsed.accessoryId
      } else {
        return // Not an accessory drop
      }
    } catch (error) {
      console.error('Invalid accessory data:', error)
      return
    }

    if (!accessoryId) return

    // Calculate position relative to the pet image container
    // event.currentTarget is the pet image container div (w-48 h-48)
    const rect = event.currentTarget.getBoundingClientRect()
    const positionX = (event.clientX - rect.left) / rect.width
    const positionY = (event.clientY - rect.top) / rect.height

    // Clamp position to 0-1 range
    const clampedX = Math.min(Math.max(positionX, 0), 1)
    const clampedY = Math.min(Math.max(positionY, 0), 1)

    // Optimistically add accessory to state immediately
    // 使用樂觀更新（暫時不更新，等待 API 回應後再刷新）
    const tempId = `temp-${Date.now()}`

    try {
      const res = await fetch('/api/pet/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessoryId,
          positionX: clampedX,
          positionY: clampedY,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to place accessory')
      }

      const newAccessory = await res.json()
      
      // 使用 SWR mutate 刷新資料
      mutateAccessories()

      toast({
        title: 'Accessory Placed!',
        description: 'Successfully added accessory to pet.',
      })
    } catch (error: any) {
      // 刷新資料以恢復正確狀態
      mutateAccessories()
      toast({
        title: 'Placement Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAccessory = async (accessoryId: string) => {
    // 使用樂觀更新（暫時不更新，等待 API 回應後再刷新）
    const accessoryToDelete = accessories.find((a: PetAccessory) => a.id === accessoryId)

    try {
      const res = await fetch(`/api/pet/accessories/${accessoryId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete accessory')
      }

      // 使用 SWR mutate 刷新資料
      mutateAccessories()

      toast({
        title: 'Accessory Removed',
        description: 'Accessory has been removed and returned to your inventory.',
      })
    } catch (error: any) {
      // 刷新資料以恢復正確狀態
      mutateAccessories()
      toast({
        title: 'Delete Failed',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Pet Settings</h1>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            size="sm"
            className="rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Pet Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{pet?.points || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Mood</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{Math.min(pet?.mood || 50, 100)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Fullness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{Math.min(pet?.fullness || 50, 100)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Pet Display with Edit on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left: Pet Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-8 relative">
                <PetDisplay 
                  pet={pet} 
                  accessories={accessories}
                  onAccessoryDelete={handleDeleteAccessory}
                  showDeleteButtons={true}
                />
                {/* Shop button as circular icon */}
                <Link href="/shop">
                  <Button
                    size="icon"
                    className="absolute top-4 right-4 w-12 h-12 rounded-full border border-black/20 bg-black text-white hover:bg-black/80 transition-colors shadow-sm"
                    aria-label="Go to Shop"
                  >
                    <ShoppingBag className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Right: Edit Pet and Accessories */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Edit Pet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="petName" className="text-xs uppercase tracking-wide text-black/60">Name</Label>
                  <Input
                    id="petName"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Enter pet name"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="petImage" className="text-xs uppercase tracking-wide text-black/60">Image</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="petImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string)
                            setImageFile(file)
                            setShowImageEditor(true)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </div>
                  {imagePreview && !showImageEditor && (
                    <div className="mt-2 text-xs text-black/60">
                      Image selected. Click &quot;Edit Image&quot; to customize.
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Image Editor Dialog */}
      {showImageEditor && imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <ImageEditor
              imageSrc={imagePreview}
              onSave={handleImageEditorSave}
              onCancel={() => {
                setShowImageEditor(false)
                setImagePreview(null)
                setImageFile(null)
              }}
              title="Edit Pet Image"
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}

