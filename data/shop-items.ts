export type ShopItemCategory = 'food' | 'decoration' | 'accessory'

export interface ShopItem {
  id: string
  name: string
  emoji: string
  cost: number
  description: string
  category: ShopItemCategory
  imageUrl?: string // For custom stickers
  isOwn?: boolean // Whether this is the user's own sticker
  isPublic?: boolean // Whether this is a public sticker from another user
  creatorName?: string // Creator name for public stickers
}

export const DECOR_SHOP_CATEGORIES: ShopItemCategory[] = ['decoration']

export const SHOP_ITEMS: ShopItem[] = [
  // Food
  { id: 'food1', name: 'Fish', emoji: '🐟', cost: 10, description: 'Delicious fish', category: 'food' },
  { id: 'food2', name: 'Bowl', emoji: '🍽️', cost: 20, description: 'Food bowl', category: 'food' },
  { id: 'food3', name: 'Treat', emoji: '🍖', cost: 15, description: 'Yummy treat', category: 'food' },

  // Decorations (includes former toys)
  { id: 'toy1', name: 'Ball', emoji: '⚽', cost: 25, description: 'Play ball', category: 'decoration' },
  { id: 'toy2', name: 'Yarn', emoji: '🧶', cost: 30, description: 'Yarn ball', category: 'decoration' },
  { id: 'toy3', name: 'Mouse', emoji: '🐭', cost: 35, description: 'Toy mouse', category: 'decoration' },
  { id: 'dec1', name: 'Rug', emoji: '⬜', cost: 50, description: 'Comfy rug', category: 'decoration' },
  { id: 'dec2', name: 'Poster', emoji: '🖼️', cost: 40, description: 'Wall poster', category: 'decoration' },
  { id: 'dec3', name: 'Plant', emoji: '🌿', cost: 45, description: 'Room plant', category: 'decoration' },

  // Accessories
  { id: 'acc1', name: 'Collar', emoji: '🎀', cost: 60, description: 'Pretty collar', category: 'accessory' },
  { id: 'acc2', name: 'Hat', emoji: '🎩', cost: 70, description: 'Stylish hat', category: 'accessory' },
]

export const SHOP_ITEM_MAP = SHOP_ITEMS.reduce<Record<string, ShopItem>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

