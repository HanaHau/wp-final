'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PetDisplay from './PetDisplay'
import Navigation from '@/components/dashboard/Navigation'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Upload, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Pet {
  id: string
  name: string
  imageUrl: string | null
  points: number
  fullness: number
  mood: number
  health: number
}

interface Purchase {
  id: string
  itemName: string
  cost: number
  purchasedAt: string
}

export default function PetSettingsContent() {
  const router = useRouter()
  const [pet, setPet] = useState<Pet | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [petName, setPetName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPet()
  }, [])

  const fetchPet = async () => {
    try {
      const res = await fetch('/api/pet')
      const data = await res.json()
      setPet(data)
      setPetName(data.name)
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error('取得寵物資訊失敗:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleSave = async () => {
    setSaving(true)
    try {
      let imageUrl = pet?.imageUrl

      // If image file is uploaded, remove background and convert to data URL
      if (imageFile) {
        try {
          imageUrl = await removeBackground(imageFile)
        } catch (error) {
          console.error('Background removal error:', error)
          // Fallback: convert to data URL without removal
          const reader = new FileReader()
          imageUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(imageFile)
          })
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

      await fetchPet()
      alert('Updated successfully!')
    } catch (error) {
      console.error('Update error:', error)
      alert('Update failed, please try again')
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">載入中...</div>
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
            className="border-2 border-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Pet Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{pet?.points || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Mood</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{pet?.mood || 50}%</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Fullness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{pet?.fullness || 50}%</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-black/60">Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{pet?.health || 100}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Pet Display with Edit on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left: Pet Display */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-black">
              <CardContent className="p-8">
                <PetDisplay pet={pet} />
              </CardContent>
            </Card>
          </div>

          {/* Right: Edit Pet */}
          <div>
            <Card className="border-2 border-black">
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
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] || null)
                      }
                    />
                    <Button variant="outline" size="sm" className="border-2 border-black">
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Purchase Section - Below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/shop">
                <Button className="w-full">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Go to Shop
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Purchase History */}
          {purchases.length > 0 && (
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Recent Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {purchases.slice(0, 5).map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex justify-between items-center p-3 border-2 border-black"
                    >
                      <div>
                        <span className="font-bold text-sm">{purchase.itemName}</span>
                        <span className="text-xs text-black/60 ml-2 block">
                          {new Date(purchase.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className="font-bold text-sm">
                        -{purchase.cost} pts
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}

