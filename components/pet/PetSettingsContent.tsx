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

  const handleSave = async () => {
    setSaving(true)
    try {
      let imageUrl = pet?.imageUrl

      // 如果有上傳圖片，這裡應該上傳到雲端儲存（如 Cloudinary、AWS S3）
      // 目前先只更新名稱
      if (imageFile) {
        // TODO: 實作圖片上傳
        alert('圖片上傳功能待實作')
        return
      }

      const res = await fetch('/api/pet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: petName,
          imageUrl,
        }),
      })

      if (!res.ok) throw new Error('更新失敗')

      await fetchPet()
      alert('更新成功！')
    } catch (error) {
      console.error('更新寵物資訊錯誤:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handlePurchase = async () => {
    const itemName = prompt('請輸入物品名稱：')
    const costStr = prompt('請輸入點數：')

    if (!itemName || !costStr) return

    const cost = parseInt(costStr)
    if (isNaN(cost) || cost <= 0) {
      alert('請輸入有效的點數')
      return
    }

    try {
      const res = await fetch('/api/pet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, cost }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '購買失敗')
      }

      await fetchPet()
      alert('購買成功！')
    } catch (error: any) {
      alert(error.message || '購買失敗')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* 標題和返回按鈕 - 緊湊 */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">寵物設定</h1>
          <div className="w-20"></div> {/* 平衡布局 */}
        </div>

        {/* 主要內容區域 - 使用 grid 布局 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          {/* 左側：寵物顯示和設定 */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* 寵物顯示 - 縮小 */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <PetDisplay pet={pet} />
              </CardContent>
            </Card>

            {/* 寵物設定表單 - 緊湊 */}
            <Card className="flex-1 flex flex-col overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">編輯寵物資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div>
                  <Label htmlFor="petName" className="text-sm">寵物名稱</Label>
                  <Input
                    id="petName"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="輸入寵物名稱"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="petImage" className="text-sm">寵物圖片</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="petImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImageFile(e.target.files?.[0] || null)
                      }
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-3 w-3 mr-1" />
                      上傳
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? '儲存中...' : '儲存變更'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右側：購買物品和記錄 */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* 購買物品 - 緊湊 */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">購買物品給寵物</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">
                    目前點數: <span className="font-bold text-purple-600">{pet?.points || 0} 點</span>
                  </p>
                </div>
                <Button onClick={handlePurchase} className="w-full">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  購買物品
                </Button>
              </CardContent>
            </Card>

            {/* 購買記錄 - 可捲動 */}
            {purchases.length > 0 && (
              <Card className="flex-1 flex flex-col overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">購買記錄</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto">
                  <div className="space-y-1.5">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex justify-between items-center p-2 border rounded text-sm"
                      >
                        <div>
                          <span className="font-medium">{purchase.itemName}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(purchase.purchasedAt).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                        <span className="text-purple-600 font-semibold text-sm">
                          -{purchase.cost} 點
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 底部導航 */}
      <Navigation />
    </div>
  )
}

