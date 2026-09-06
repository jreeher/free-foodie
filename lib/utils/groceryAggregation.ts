import { Ingredient } from '../database.types';
import { parseAmount, formatAmount } from './fractions';

export type AggregatedIngredient = {
  name: string;
  amount: string | null;
  unit: string | null;
  aisle_category: string;
};

type RecipeEntry = {
  ingredients: Ingredient[];
  servings: number;             // recipe's base servings
  servingsOverride: number | null; // how many servings to plan for
};

/**
 * Normalize an ingredient name for deduplication.
 * Lowercases, removes trailing 's' for simple plurals, strips extra whitespace.
 */
function normalizeKey(name: string, unit: string | null): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const u = (unit ?? '').trim().toLowerCase();
  // Simple depluralization: "tomatoes" → "tomato", "eggs" → "egg"
  // Note: avoid lookbehind assertions — they crash on older Android JS engines (Hermes).
  // Use a capturing group instead: match a non-vowel char followed by 's' at end of string.
  const depluralized = n.replace(/oes$/, 'o').replace(/([^aeiou])s$/, '$1');
  return `${depluralized}||${u}`;
}

/**
 * Try to add two amount strings. Returns null if either isn't parseable as a
 * number (e.g. "to taste") — in that case the caller keeps them separate.
 */
function tryAddAmounts(a: string | null, b: string | null): string | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  const va = parseAmount(a);
  const vb = parseAmount(b);
  // If either amount parses to 0 it's non-numeric (e.g. "to taste", "pinch").
  // Keep them as separate line items rather than merging.
  if (va === 0 || vb === 0) return null;
  return formatAmount(va + vb);
}

/**
 * Aggregate ingredients from multiple recipe entries into a deduplicated list.
 * Ingredients with the same name + unit are summed; otherwise they stay separate.
 */
export function aggregateIngredients(entries: RecipeEntry[]): AggregatedIngredient[] {
  // Map from normalized key → accumulated ingredient
  const map = new Map<string, AggregatedIngredient & { count: number }>();

  for (const entry of entries) {
    const multiplier =
      entry.servingsOverride != null && entry.servings > 0
        ? entry.servingsOverride / entry.servings
        : 1;

    for (const ing of entry.ingredients) {
      if (!ing.name?.trim()) continue;

      // Scale amount
      let scaledAmount: string | null = null;
      if (ing.amount?.trim()) {
        const parsed = parseAmount(ing.amount);
        scaledAmount = parsed > 0 ? formatAmount(parsed * multiplier) : ing.amount;
      }

      const unit = ing.unit?.trim() || null;
      const key = normalizeKey(ing.name, unit);
      const existing = map.get(key);

      if (existing) {
        // Try to merge amounts
        const merged = tryAddAmounts(existing.amount, scaledAmount);
        if (merged !== null) {
          existing.amount = merged;
          existing.count += 1;
        } else {
          // Unparseable amounts — create a separate entry with a suffix key
          const suffixKey = `${key}||${existing.count}`;
          map.set(suffixKey, {
            name: ing.name.trim(),
            amount: scaledAmount,
            unit,
            aisle_category: ing.aisle_category ?? 'Other',
            count: 1,
          });
        }
      } else {
        map.set(key, {
          name: ing.name.trim(),
          amount: scaledAmount,
          unit,
          aisle_category: ing.aisle_category ?? 'Other',
          count: 1,
        });
      }
    }
  }

  // Return sorted by aisle_category then name
  return Array.from(map.values())
    .map(({ count: _count, ...item }) => item)
    .sort((a, b) => {
      const aisleCompare = a.aisle_category.localeCompare(b.aisle_category);
      if (aisleCompare !== 0) return aisleCompare;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Group a flat list of items by aisle_category, maintaining a stable
 * aisle order based on AISLE_ORDER.
 */
export const AISLE_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Dry Goods & Pasta',
  'Canned & Jarred',
  'Condiments & Sauces',
  'Oils & Vinegars',
  'Spices & Herbs',
  'Baking',
  'Frozen',
  'Beverages',
  'Snacks',
  'Other',
] as const;

export type AisleGroup<T> = {
  aisle: string;
  items: T[];
};

export function groupByAisle<T extends { aisle_category: string }>(items: T[]): AisleGroup<T>[] {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const aisle = item.aisle_category || 'Other';
    if (!grouped.has(aisle)) grouped.set(aisle, []);
    grouped.get(aisle)!.push(item);
  }

  // Sort aisles by AISLE_ORDER, unknown aisles go to end
  const sorted = Array.from(grouped.entries()).sort(([a], [b]) => {
    const ai = AISLE_ORDER.indexOf(a as typeof AISLE_ORDER[number]);
    const bi = AISLE_ORDER.indexOf(b as typeof AISLE_ORDER[number]);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return sorted.map(([aisle, items]) => ({ aisle, items }));
}
