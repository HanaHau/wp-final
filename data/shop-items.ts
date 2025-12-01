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
  // Food - 一般5、高級10、精品20
  { id: 'food1', name: 'Fish', emoji: '🐟', cost: 5, description: 'Delicious fish', category: 'food' }, // 一般
  { id: 'food2', name: 'Bowl', emoji: '🍽️', cost: 10, description: 'Food bowl', category: 'food' }, // 高級
  { id: 'food3', name: 'Treat', emoji: '🍖', cost: 20, description: 'Yummy treat', category: 'food' }, // 精品

  // Decorations - 一般50、高級100、精品150
  { id: 'toy1', name: 'Ball', emoji: '⚽', cost: 50, description: 'Play ball', category: 'decoration' }, // 一般
  { id: 'toy2', name: 'Yarn', emoji: '🧶', cost: 100, description: 'Yarn ball', category: 'decoration' }, // 高級
  { id: 'toy3', name: 'Mouse', emoji: '🐭', cost: 150, description: 'Toy mouse', category: 'decoration' }, // 精品
  { id: 'dec1', name: 'Rug', emoji: '⬜', cost: 50, description: 'Comfy rug', category: 'decoration' }, // 一般
  { id: 'dec2', name: 'Poster', emoji: '🖼️', cost: 100, description: 'Wall poster', category: 'decoration' }, // 高級
  { id: 'dec3', name: 'Plant', emoji: '🌿', cost: 150, description: 'Room plant', category: 'decoration' }, // 精品

  // Accessories - 一般50、高級100
  { id: 'acc1', name: 'Collar', emoji: '🎀', cost: 50, description: 'Pretty collar', category: 'accessory' }, // 一般
  { id: 'acc2', name: 'Hat', emoji: '🎩', cost: 100, description: 'Stylish hat', category: 'accessory' }, // 高級
]

export const SHOP_ITEM_MAP = SHOP_ITEMS.reduce<Record<string, ShopItem>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

