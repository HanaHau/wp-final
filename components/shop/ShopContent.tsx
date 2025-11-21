'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Navigation from '@/components/dashboard/Navigation'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Pet {
  id: string
  points: number
}

interface ShopItem {
  id: string
  name: string
  emoji: string
  cost: number
  description: string
  category: 'food' | 'toy' | 'decoration' | 'accessory'
}

const shopItems: ShopItem[] = [
  // Food items
  { id: 'food1', name: 'Fish', emoji: '🐟', cost: 10, description: 'Delicious fish', category: 'food' },
  { id: 'food2', name: 'Bowl', emoji: '🍽️', cost: 20, description: 'Food bowl', category: 'food' },
  { id: 'food3', name: 'Treat', emoji: '🍖', cost: 15, description: 'Yummy treat', category: 'food' },
  
  // Toys
  { id: 'toy1', name: 'Ball', emoji: '⚽', cost: 25, description: 'Play ball', category: 'toy' },
  { id: 'toy2', name: 'Yarn', emoji: '🧶', cost: 30, description: 'Yarn ball', category: 'toy' },
  { id: 'toy3', name: 'Mouse', emoji: '🐭', cost: 35, description: 'Toy mouse', category: 'toy' },
  
  // Decorations
  { id: 'dec1', name: 'Rug', emoji: '⬜', cost: 50, description: 'Comfy rug', category: 'decoration' },
  { id: 'dec2', name: 'Poster', emoji: '🖼️', cost: 40, description: 'Wall poster', category: 'decoration' },
  { id: 'dec3', name: 'Plant', emoji: '🌿', cost: 45, description: 'Room plant', category: 'decoration' },
  
  // Accessories
  { id: 'acc1', name: 'Collar', emoji: '🎀', cost: 60, description: 'Pretty collar', category: 'accessory' },
  { id: 'acc2', name: 'Hat', emoji: '🎩', cost: 70, description: 'Stylish hat', category: 'accessory' },
]

export default function ShopContent() {
  const router = useRouter()
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchPet()
  }, [])

  const fetchPet = async () => {
    try {
      const res = await fetch('/api/pet')
      const data = await res.json()
      setPet(data)
    } catch (error) {
      console.error('Failed to fetch pet:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (item: ShopItem) => {
    if (!pet || pet.points < item.cost) {
      alert('Not enough points!')
      return
    }

    setPurchasing(item.id)
    try {
      const res = await fetch('/api/pet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.name,
          cost: item.cost,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Purchase failed')
      }

      await fetchPet()
      alert(`Purchased ${item.name}!`)
    } catch (error: any) {
      alert(error.message || 'Purchase failed')
    } finally {
      setPurchasing(null)
    }
  }

  const filteredItems = selectedCategory === 'all'
    ? shopItems
    : shopItems.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Shop</h1>
          <Button
            variant="outline"
            onClick={() => router.push('/pet')}
            className="border-2 border-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Points Display */}
        <Card className="border-2 border-black mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-black/60">Available Points</p>
                <p className="text-3xl font-bold text-black">{pet?.points || 0}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-black" />
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'food', 'toy', 'decoration', 'accessory'].map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className="border-2 border-black whitespace-nowrap"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>

        {/* Shop Items Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="border-2 border-black">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">{item.emoji}</div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">{item.name}</h3>
                  <p className="text-xs text-black/60 mt-1">{item.description}</p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-black/60">Cost</span>
                  <span className="font-bold text-lg">{item.cost} pts</span>
                </div>
                <Button
                  onClick={() => handlePurchase(item)}
                  disabled={!pet || pet.points < item.cost || purchasing === item.id}
                  className="w-full"
                >
                  {purchasing === item.id ? 'Buying...' : pet && pet.points >= item.cost ? 'Buy' : 'Not Enough'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  )
}

