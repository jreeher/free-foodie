import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { FoodBankItem } from '../database.types';
import { useUser } from './useAuth';

/** Full catalog, ordered by category then name — for grouped "browse" lists. */
export function useFoodBankItems() {
  const user = useUser();

  return useQuery({
    queryKey: ['food_bank_items'],
    queryFn: async (): Promise<FoodBankItem[]> => {
      const { data, error } = await supabase
        .from('food_bank_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as FoodBankItem[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // catalog rarely changes — cache for an hour
  });
}

/** Name search against the catalog, for the pantry "add by search" flow. */
export function useFoodBankItemSearch(query: string) {
  const user = useUser();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['food_bank_items', 'search', trimmed],
    queryFn: async (): Promise<FoodBankItem[]> => {
      const { data, error } = await supabase
        .from('food_bank_items')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .order('name', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as FoodBankItem[];
    },
    enabled: !!user && trimmed.length > 0,
  });
}

/** Group a flat item list by category, preserving each category's first-seen order. */
export function groupByCategory(items: FoodBankItem[]): { category: string; items: FoodBankItem[] }[] {
  const groups: { category: string; items: FoodBankItem[] }[] = [];
  for (const item of items) {
    const existing = groups.find((g) => g.category === item.category);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ category: item.category, items: [item] });
    }
  }
  return groups;
}
