import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';

export type RatingSummary = {
  average: number | null;
  count: number;
  userRating: number | null;
};

export function useRecipeRating(recipeId: string) {
  const user = useUser();

  return useQuery({
    queryKey: ['recipe_ratings', recipeId],
    queryFn: async (): Promise<RatingSummary> => {
      const { data, error } = await supabase
        .from('recipe_ratings')
        .select('rating, user_id')
        .eq('recipe_id', recipeId);
      if (error) throw error;

      const rows = data ?? [];
      const count = rows.length;
      const average = count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : null;
      const userRating = rows.find((r) => r.user_id === user?.id)?.rating ?? null;

      return { average, count, userRating };
    },
    enabled: !!recipeId,
  });
}

export function useSubmitRating() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ recipeId, rating }: { recipeId: string; rating: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('recipe_ratings')
        .upsert(
          { recipe_id: recipeId, user_id: user.id, rating },
          { onConflict: 'recipe_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, { recipeId }) => {
      qc.invalidateQueries({ queryKey: ['recipe_ratings', recipeId] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      showToast('Rating saved', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
