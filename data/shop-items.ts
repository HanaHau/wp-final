export type ShopItemCategory = 'food' | 'decoration' | 'accessory'

export interface ShopItem {
  id: string
  name: string
  emoji: string
  cost: number
  description: string
  category: ShopItemCategory
  fullnessRecovery?: number // For food items: how much fullness % it recovers (equals cost)
  imageUrl?: string // For custom stickers
  isOwn?: boolean // Whether this is the user's own sticker
  isPublic?: boolean // Whether this is a public sticker from another user
  creatorName?: string // Creator name for public stickers
}

export const DECOR_SHOP_CATEGORIES: ShopItemCategory[] = ['decoration']

export const SHOP_ITEMS: ShopItem[] = [
  // Food - fullnessRecovery = cost (5pts = 5%, 10pts = 10%, 20pts = 20%)
  { id: 'food1', name: 'Fish', emoji: '🐟', cost: 5, description: 'Delicious fish', category: 'food', fullnessRecovery: 5 },
  { id: 'food2', name: 'Bowl', emoji: '🍽️', cost: 10, description: 'Food bowl', category: 'food', fullnessRecovery: 10 },
  { id: 'food3', name: 'Treat', emoji: '🍖', cost: 20, description: 'Yummy treat', category: 'food', fullnessRecovery: 20 },

  // Decorations - 一般50、高級100、精品150
  { id: 'toy1', name: 'Ball', emoji: '⚽', cost: 50, description: 'Play ball', category: 'decoration' },
  { id: 'toy2', name: 'Yarn', emoji: '🧶', cost: 100, description: 'Yarn ball', category: 'decoration' },
  { id: 'toy3', name: 'Mouse', emoji: '🐭', cost: 150, description: 'Toy mouse', category: 'decoration' },
  { id: 'dec1', name: 'Rug', emoji: '⬜', cost: 50, description: 'Comfy rug', category: 'decoration' },
  { id: 'dec2', name: 'Poster', emoji: '🖼️', cost: 100, description: 'Wall poster', category: 'decoration' },
  { id: 'dec3', name: 'Plant', emoji: '🌿', cost: 150, description: 'Room plant', category: 'decoration' },

  // Accessories - 一般50、高級100
  { id: 'acc1', name: 'Collar', emoji: '🎀', cost: 50, description: 'Pretty collar', category: 'accessory' },
  { id: 'acc2', name: 'Hat', emoji: '🎩', cost: 100, description: 'Stylish hat', category: 'accessory' },
]

export const SHOP_ITEM_MAP = SHOP_ITEMS.reduce<Record<string, ShopItem>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

