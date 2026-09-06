import { AisleCategory } from '../theme';

const UNITS = [
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons', 'Tbsp',
  'cup', 'cups', 'c',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'mL', 'milliliter', 'milliliters',
  'l', 'L', 'liter', 'liters',
  'fl oz', 'fluid ounce', 'fluid ounces',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'inch', 'inches', 'in',
  'clove', 'cloves',
  'sprig', 'sprigs',
  'bunch', 'bunches',
  'stalk', 'stalks',
  'slice', 'slices',
  'can', 'cans',
  'package', 'packages', 'pkg',
  'bag', 'bags',
  'bottle', 'bottles',
  'jar', 'jars',
  'piece', 'pieces',
  'head', 'heads',
  'sheet', 'sheets',
  'pinch', 'dash',
  'handful', 'handfuls',
];

const UNIT_REGEX = new RegExp(
  `^(${UNITS.map(u => u.replace(/\./g, '\\.')).join('|')})\\.?\\s`,
  'i'
);

/** Try to parse "2 cups flour" into { amount: "2", unit: "cups", name: "flour" } */
export function parseIngredientString(raw: string): {
  amount: string;
  unit: string;
  name: string;
} {
  const trimmed = raw.trim();

  // Match optional amount at start: digits, fractions, unicode fractions
  const amountMatch = trimmed.match(
    /^([\d\u00BC\u00BD\u00BE\u2153-\u215E]+(?:[\/\-]\d+)?(?:\s+\d+\/\d+)?)\s*(.*)/
  );

  if (!amountMatch) {
    return { amount: '', unit: '', name: trimmed };
  }

  const amount = amountMatch[1];
  const rest = amountMatch[2];

  // Try to find a unit at the start of rest
  const unitMatch = rest.match(UNIT_REGEX);
  if (unitMatch) {
    const unit = unitMatch[1];
    const name = rest.slice(unitMatch[0].length).trim();
    return { amount, unit, name };
  }

  return { amount, unit: '', name: rest };
}

/** Normalize ingredient name for deduplication (lowercase, singular-ish) */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove parenthetical notes
    .replace(/,.*$/, '')     // Remove descriptor after comma
    .replace(/\b(finely|coarsely|freshly|roughly|thinly|thickly)\s+(chopped|diced|sliced|grated|minced|ground)\b/gi, '')
    .replace(/\b(chopped|diced|sliced|grated|minced|ground|crushed|peeled|trimmed|halved|quartered)\b/gi, '')
    .replace(/\bfresh\b/gi, '')
    .replace(/\bfrozen\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    // Basic pluralization: trailing 's' but not 'ss'
    .replace(/(?<![s])s$/, '');
}

/** Guess aisle category from ingredient name */
export function guessAisleCategory(name: string): AisleCategory {
  const n = name.toLowerCase();

  if (/\b(apple|banana|berry|berries|lemon|lime|orange|grape|tomato|onion|garlic|ginger|carrot|celery|pepper|lettuce|spinach|kale|broccoli|zucchini|cucumber|potato|sweet potato|herb|basil|cilantro|parsley|thyme|rosemary|mint|dill|scallion|mushroom|corn|avocado|mango|pear|peach|plum|pineapple|melon|cabbage|beet|radish|turnip|fennel|leek|shallot|arugula|watercress|chard|bok choy)\b/.test(n)) {
    return 'Produce';
  }
  if (/\b(milk|cream|butter|cheese|egg|yogurt|sour cream|cream cheese|mozzarella|parmesan|cheddar|ricotta|feta|brie|gouda|half and half|heavy cream|whipping cream)\b/.test(n)) {
    return 'Dairy & Eggs';
  }
  if (/\b(chicken|beef|pork|lamb|turkey|bacon|sausage|ground|steak|chop|ribs|fish|salmon|tuna|shrimp|crab|lobster|scallop|clam|oyster|mussel|anchovy|cod|tilapia|halibut|mahi|sea bass|trout)\b/.test(n)) {
    return 'Meat & Seafood';
  }
  if (/\b(bread|baguette|roll|bun|croissant|bagel|muffin|tortilla|pita|naan|sourdough|sandwich)\b/.test(n)) {
    return 'Bakery';
  }
  if (/\b(frozen|ice cream|popsicle|edamame)\b/.test(n)) {
    return 'Frozen';
  }
  if (/\b(can|canned|jar|jarred|tomatoes|beans|chickpeas|lentils|coconut milk|broth|stock|olives|artichoke|palm heart|tuna can)\b/.test(n)) {
    return 'Canned & Jarred';
  }
  if (/\b(ketchup|mustard|mayo|mayonnaise|hot sauce|soy sauce|worcestershire|sriracha|vinegar|olive oil|oil|salsa|relish|tahini|hoisin|oyster sauce|fish sauce|miso|barbecue|bbq|ranch|caesar)\b/.test(n)) {
    return 'Condiments & Sauces';
  }
  if (/\b(salt|pepper|cumin|paprika|chili|cinnamon|nutmeg|clove|oregano|turmeric|curry|cayenne|garlic powder|onion powder|bay leaf|cardamom|coriander|allspice|anise|fennel seed|caraway|sumac|za'atar)\b/.test(n)) {
    return 'Spices & Seasonings';
  }
  if (/\b(pasta|spaghetti|penne|rigatoni|fettuccine|linguine|fusilli|rotini|orzo|rice|quinoa|couscous|bulgur|farro|barley|oats|oatmeal|bread crumb|panko|flour|cornmeal|polenta|noodle|ramen|udon|soba)\b/.test(n)) {
    return 'Grains & Pasta';
  }
  if (/\b(chip|cracker|pretzel|popcorn|nut|almond|cashew|walnut|pecan|peanut|pistachio|seed|pumpkin seed|sunflower|granola|bar|trail mix)\b/.test(n)) {
    return 'Snacks';
  }
  if (/\b(water|juice|soda|wine|beer|coffee|tea|broth|stock|spirits|vodka|rum|whiskey|lemonade|milk alternative|oat milk|almond milk|soy milk)\b/.test(n)) {
    return 'Beverages';
  }
  if (/\b(sugar|brown sugar|powdered sugar|honey|maple syrup|molasses|agave|baking powder|baking soda|yeast|vanilla|extract|cocoa|chocolate|sprinkles|gelatin|cornstarch|arrowroot)\b/.test(n)) {
    return 'Baking';
  }
  if (/\b(deli|ham|salami|pepperoni|prosciutto|turkey breast|roast beef|provolone|swiss|american cheese|hummus|pate)\b/.test(n)) {
    return 'Deli';
  }

  return 'Other';
}
