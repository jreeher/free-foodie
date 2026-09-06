export * from './colors';
export * from './typography';
export * from './spacing';

export const AISLE_CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Canned & Jarred',
  'Condiments & Sauces',
  'Spices & Seasonings',
  'Grains & Pasta',
  'Snacks',
  'Beverages',
  'Baking',
  'Deli',
  'Other',
] as const;

export type AisleCategory = typeof AISLE_CATEGORIES[number];

export const DEFAULT_CATEGORIES = [
  { name: 'Pasta', icon: '🍝', sort_order: 0 },
  { name: 'Rice', icon: '🍚', sort_order: 1 },
  { name: 'Soup', icon: '🍲', sort_order: 2 },
  { name: 'Meat', icon: '🥩', sort_order: 3 },
  { name: 'Seafood', icon: '🐟', sort_order: 4 },
  { name: 'Vegetarian', icon: '🥦', sort_order: 5 },
  { name: 'Fancy', icon: '✨', sort_order: 6 },
  { name: 'Salads', icon: '🥗', sort_order: 7 },
  { name: 'Slow Cooker', icon: '🫙', sort_order: 8 },
  { name: 'Quick', icon: '⚡', sort_order: 9 },
  { name: 'Grilling', icon: '🔥', sort_order: 10 },
  { name: 'Exclude from Meal Planning', icon: '🚫', sort_order: 99 },
] as const;

export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'beverage',
  'appetizer',
  'dessert',
] as const;

export type MealType = typeof MEAL_TYPES[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  beverage: 'Beverage',
  appetizer: 'Appetizer',
  dessert: 'Dessert',
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  beverage: '🥤',
  appetizer: '🫕',
  dessert: '🍰',
};

/** Simplified store sections shown in the grocery list */
export const STORE_SECTIONS = [
  'Produce',
  'Dairy',
  'Dry Goods',
  'Meat & Seafood',
  'Bakery',
  'Deli',
  'Frozen',
  'Other',
] as const;

export type StoreSection = typeof STORE_SECTIONS[number];

/** Maps the detailed ingredient aisle categories → simplified store sections */
export const AISLE_TO_STORE_SECTION: Record<string, StoreSection> = {
  'Produce': 'Produce',
  'Dairy & Eggs': 'Dairy',
  'Meat & Seafood': 'Meat & Seafood',
  'Bakery': 'Bakery',
  'Frozen': 'Frozen',
  'Canned & Jarred': 'Dry Goods',
  'Condiments & Sauces': 'Dry Goods',
  'Spices & Seasonings': 'Dry Goods',
  'Grains & Pasta': 'Dry Goods',
  'Snacks': 'Dry Goods',
  'Beverages': 'Dry Goods',
  'Baking': 'Dry Goods',
  'Deli': 'Deli',
  'Other': 'Other',
};

export const SEASON_TAGS = ['spring', 'summer', 'fall', 'winter'] as const;
export const OCCASION_TAGS = [
  'holiday',
  'thanksgiving',
  'christmas',
  'halloween',
  'valentines',
  'super bowl',
  'birthday',
] as const;

export type SeasonTag = typeof SEASON_TAGS[number];

export const BOOK_PALETTE: { cover: string; spine: string; text: string }[] = [
  { cover: '#8B3A52', spine: '#6B2A3E', text: '#FFE8F0' }, // Burgundy
  { cover: '#2C4770', spine: '#1C3760', text: '#E8F0FF' }, // Navy
  { cover: '#3D6B4F', spine: '#2D5B3F', text: '#E8FFF2' }, // Forest
  { cover: '#6B4C8B', spine: '#5A3A7A', text: '#F2E8FF' }, // Plum
  { cover: '#8B6914', spine: '#7A5804', text: '#FFF8E8' }, // Amber
  { cover: '#2B6E6E', spine: '#1B5B5B', text: '#E8FFFF' }, // Teal
  { cover: '#8B4513', spine: '#7A3403', text: '#FFF2E8' }, // Sienna
  { cover: '#4A5E72', spine: '#3A4E62', text: '#EAF2FF' }, // Slate
  { cover: '#C0392B', spine: '#A93226', text: '#FFE8E6' }, // Crimson — reserved for Simmer Down Favorites
];

/** Index of the reserved Simmer Down Favorites palette entry. Never assigned by the hash function. */
export const FAVORITES_PALETTE_INDEX = 8;

/** Returns a deterministic BOOK_PALETTE index for any string ID.
 *  Always returns 0–7, leaving index 8 reserved for Simmer Down Favorites. */
export function paletteIndexFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % (BOOK_PALETTE.length - 1);
}
