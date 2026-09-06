import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { FoodBankItem } from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';

const PANTRY_KEY = 'user_pantry';

export type PantryItem = {
  id: string;
  food_bank_item_id: string;
  received_at: string;
  food_bank_item: FoodBankItem;
};

export function useUserPantry() {
  const user = useUser();

  return useQuery({
    queryKey: [PANTRY_KEY, user?.id],
    queryFn: async (): Promise<PantryItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_pantry')
        .select('id, food_bank_item_id, received_at, food_bank_item:food_bank_items(*)')
        .order('received_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.id,
        food_bank_item_id: row.food_bank_item_id,
        received_at: row.received_at,
        food_bank_item: row.food_bank_item as FoodBankItem,
      }));
    },
    enabled: !!user,
  });
}

export function useAddPantryItem() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (foodBankItemId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_pantry')
        .upsert(
          { user_id: user.id, food_bank_item_id: foodBankItemId },
          { onConflict: 'user_id,food_bank_item_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PANTRY_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useRemovePantryItem() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (pantryRowId: string) => {
      const { error } = await supabase.from('user_pantry').delete().eq('id', pantryRowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PANTRY_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
