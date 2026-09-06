import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Recipe, RecipeInsert, RecipeUpdate, SkillLevel } from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { imageUriToArrayBuffer } from '../utils/webCompat';

export type RecipeWithMeta = Recipe & {
  foodBankItemIds: string[];
  avgRating: number | null;
  ratingCount: number;
  submitterName: string | null;
};

export type RecipeFilters = {
  search?: string;
  skillLevel?: SkillLevel;
  foodBankItemId?: string;
  canMakeNow?: boolean;
  /** Only the current session user's own recipes — used by the Profile tab. */
  mine?: boolean;
};

const RECIPES_KEY = 'recipes';

/** Always resolves to the same shape whether or not there are ids to look up —
 *  keeps this out of the Promise.all tuple below so its type doesn't have to
 *  unify with a real PostgrestResponse via a ternary. */
async function fetchProfileNames(ids: string[]): Promise<{ user_id: string; display_name: string | null; email: string }[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles').select('user_id, display_name, email').in('user_id', ids);
  if (error) throw error;
  return data;
}

/** Attaches tag ids, rating summary, and submitter display name to a list of raw recipe rows. */
async function attachMeta(recipes: Recipe[]): Promise<RecipeWithMeta[]> {
  if (recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id);
  const userIds = Array.from(new Set(recipes.map((r) => r.user_id).filter(Boolean))) as string[];

  const [tagsRes, ratingsRes, profileRows] = await Promise.all([
    supabase.from('recipe_food_bank_items').select('recipe_id, food_bank_item_id').in('recipe_id', ids),
    supabase.from('recipe_ratings').select('recipe_id, rating').in('recipe_id', ids),
    fetchProfileNames(userIds),
  ]);

  if (tagsRes.error) throw tagsRes.error;
  if (ratingsRes.error) throw ratingsRes.error;

  const tagsByRecipe = new Map<string, string[]>();
  for (const row of tagsRes.data ?? []) {
    const list = tagsByRecipe.get(row.recipe_id) ?? [];
    list.push(row.food_bank_item_id);
    tagsByRecipe.set(row.recipe_id, list);
  }

  const ratingsByRecipe = new Map<string, number[]>();
  for (const row of ratingsRes.data ?? []) {
    const list = ratingsByRecipe.get(row.recipe_id) ?? [];
    list.push(row.rating);
    ratingsByRecipe.set(row.recipe_id, list);
  }

  const nameByUser = new Map<string, string>();
  for (const row of profileRows) {
    nameByUser.set(row.user_id, row.display_name || row.email.split('@')[0]);
  }

  return recipes.map((recipe) => {
    const ratings = ratingsByRecipe.get(recipe.id) ?? [];
    return {
      ...recipe,
      foodBankItemIds: tagsByRecipe.get(recipe.id) ?? [],
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      ratingCount: ratings.length,
      submitterName: recipe.user_id ? nameByUser.get(recipe.user_id) ?? null : null,
    };
  });
}

export function useRecipes(filters?: RecipeFilters) {
  const user = useUser();

  return useQuery({
    queryKey: [RECIPES_KEY, user?.id, filters],
    queryFn: async (): Promise<RecipeWithMeta[]> => {
      let query = supabase.from('recipes').select('*').order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters?.skillLevel) {
        query = query.eq('skill_level', filters.skillLevel);
      }
      if (filters?.mine) {
        if (!user) return [];
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      let withMeta = await attachMeta(data as Recipe[]);

      if (filters?.foodBankItemId) {
        withMeta = withMeta.filter((r) => r.foodBankItemIds.includes(filters.foodBankItemId!));
      }

      if (filters?.canMakeNow) {
        if (!user) return [];
        const { data: pantryRows, error: pantryError } = await supabase
          .from('user_pantry')
          .select('food_bank_item_id')
          .eq('user_id', user.id);
        if (pantryError) throw pantryError;
        const pantryIds = new Set((pantryRows ?? []).map((p) => p.food_bank_item_id));
        withMeta = withMeta.filter(
          (r) => r.foodBankItemIds.length > 0 && r.foodBankItemIds.every((id) => pantryIds.has(id))
        );
      }

      return withMeta;
    },
    enabled: !filters?.mine || !!user,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: async (): Promise<RecipeWithMeta> => {
      const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
      if (error) throw error;
      const [withMeta] = await attachMeta([data as Recipe]);
      return withMeta;
    },
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      recipe,
      foodBankItemIds,
    }: {
      recipe: Omit<RecipeInsert, 'user_id'>;
      foodBankItemIds: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recipes')
        .insert({ ...recipe, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      if (foodBankItemIds.length) {
        const { error: tagError } = await supabase
          .from('recipe_food_bank_items')
          .insert(foodBankItemIds.map((food_bank_item_id) => ({ recipe_id: data.id, food_bank_item_id })));
        if (tagError) throw tagError;
      }

      return data as Recipe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe saved!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      id,
      recipe,
      foodBankItemIds,
    }: {
      id: string;
      recipe: RecipeUpdate;
      foodBankItemIds: string[];
    }) => {
      const { error } = await supabase.from('recipes').update(recipe).eq('id', id);
      if (error) throw error;

      const { error: delError } = await supabase.from('recipe_food_bank_items').delete().eq('recipe_id', id);
      if (delError) throw delError;

      if (foodBankItemIds.length) {
        const { error: insError } = await supabase
          .from('recipe_food_bank_items')
          .insert(foodBankItemIds.map((food_bank_item_id) => ({ recipe_id: id, food_bank_item_id })));
        if (insError) throw insError;
      }

      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      qc.invalidateQueries({ queryKey: [RECIPES_KEY, id] });
      showToast('Recipe updated', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: recipe } = await supabase.from('recipes').select('image_url').eq('id', id).single();

      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;

      if (recipe?.image_url) {
        try {
          const marker = '/recipe-images/';
          const idx = recipe.image_url.indexOf(marker);
          if (idx !== -1) {
            const storagePath = recipe.image_url.slice(idx + marker.length);
            await supabase.storage.from('recipe-images').remove([storagePath]);
          }
        } catch {
          // Swallow — orphaned image is a minor issue, don't surface to user
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe deleted', 'info');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUploadRecipeImage() {
  const user = useUser();

  return useMutation({
    mutationFn: async ({ uri, recipeId }: { uri: string; recipeId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { arrayBuffer, ext } = await imageUriToArrayBuffer(uri);
      const filename = `${user.id}/${recipeId ?? Date.now()}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, arrayBuffer, { contentType, upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('recipe-images').getPublicUrl(data.path);
      return publicUrl;
    },
  });
}
