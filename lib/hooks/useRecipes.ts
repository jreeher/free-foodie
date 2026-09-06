import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Recipe, RecipeInsert, RecipeUpdate } from '../database.types';
import { useUser, useProfile } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { imageUriToArrayBuffer } from '../utils/webCompat';

export type RecipeFilters = {
  search?: string;
  categories?: string[];
  tags?: string[];
  minRating?: number;
  maxCookTime?: number;
  favoritesOnly?: boolean;
  mealType?: string;
  /** When set, only return recipes with these IDs (used for book filtering). Skips is_default=false filter. */
  recipeIds?: string[];
};

export type RecipeSortBy = 'created_at' | 'rating' | 'title' | 'total_time_minutes';

const RECIPES_KEY = 'recipes';
const DEFAULT_RECIPES_KEY = 'default_recipes';

export function useRecipes(filters?: RecipeFilters, sortBy: RecipeSortBy = 'created_at') {
  const user = useUser();

  return useQuery({
    queryKey: [RECIPES_KEY, user?.id, filters, sortBy],
    queryFn: async (): Promise<Recipe[]> => {
      if (!user) return [];

      // No explicit user_id filter — RLS handles access:
      //   • "Users can view their own recipes"  (user_id = auth.uid())
      //   • "Household members can view shared recipes" (household_id matches)
      // Exclude built-in default/Surprise Me recipes from the main list.
      let query = supabase.from('recipes').select('*');

      if (filters?.recipeIds) {
        // Book filter: show exactly these recipe IDs (may include defaults)
        if (filters.recipeIds.length === 0) return [];
        query = query.in('id', filters.recipeIds);
      } else {
        query = query.eq('is_default', false);
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
      }
      if (filters?.maxCookTime) {
        query = query.lte('cook_time_minutes', filters.maxCookTime);
      }
      if (filters?.favoritesOnly) {
        query = query.eq('is_favorite', true);
      }

      if (filters?.categories?.length) {
        query = query.overlaps('categories', filters.categories);
      }
      if (filters?.tags?.length) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters?.mealType) {
        query = query.eq('meal_type', filters.mealType);
      }

      // Sort
      const ascending = sortBy === 'title';
      query = query.order(sortBy, { ascending, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;

      return data as Recipe[];
    },
    enabled: !!user,
  });
}

export function useRecipe(id: string) {
  const user = useUser();

  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: async (): Promise<Recipe> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Recipe;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (recipe: Omit<RecipeInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      // Use .select() without .single() to avoid PostgREST "cannot coerce the
      // result into a single JSON object" errors on accounts that are household
      // members — two SELECT RLS policies (user_id AND household_id) can both
      // match the newly inserted row, causing older PostgREST to return it twice.
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          ...recipe,
          user_id: user.id,
          // Link to household so all members can see it
          household_id: recipe.household_id ?? profile?.household_id ?? null,
        })
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Recipe not saved');
      return data[0] as Recipe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe saved!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RecipeUpdate }) => {
      // Don't use .select() / RETURNING here. For household members the UPDATE
      // policy is scoped to user_id = auth.uid(), but the two SELECT policies
      // (user_id AND household_id) both match the same row — older PostgREST
      // returns the row twice in the RETURNING result, causing errors. We skip
      // RETURNING entirely and rely on invalidateQueries to refetch the updated data.
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      qc.invalidateQueries({ queryKey: [RECIPES_KEY, id] });
      showToast('Recipe updated', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch image URL before deleting so we can clean up storage
      const { data: recipe } = await supabase
        .from('recipes')
        .select('image_url')
        .eq('id', id)
        .single();

      // Delete from DB first
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;

      // Clean up the image from storage (best-effort — don't fail the delete if this errors)
      if (recipe?.image_url) {
        try {
          // URL format: .../storage/v1/object/public/recipe-images/<path>
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
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('recipes')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, isFavorite }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: [RECIPES_KEY] });
      qc.setQueryData([RECIPES_KEY, id], (old: Recipe | undefined) =>
        old ? { ...old, is_favorite: !isFavorite } : old
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
    },
  });
}

export function useCategories() {
  const user = useUser();

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Read profile fresh from the store so we never use a stale closure value.
      // (The household_id may have been set during the same event loop tick by
      //  a preceding mutation, and the component may not have re-rendered yet.)
      const profile = useAuthStore.getState().profile;

      // Ensure the user has a household — categories require one for RLS.
      // We use a SECURITY DEFINER RPC to avoid RLS auth.uid() race conditions.
      let householdId = profile?.household_id ?? null;
      if (!householdId) {
        const displayName =
          profile?.display_name ??
          (profile?.email ? profile.email.split('@')[0] : 'My');

        const { data: newHouseholdId, error: householdError } = await supabase
          .rpc('create_household_for_user', {
            household_name: `${displayName}'s Kitchen`,
          });

        if (householdError) throw householdError;
        householdId = newHouseholdId as string;

        // Update the local Zustand store — the RPC already updated Supabase.
        const cur = useAuthStore.getState().profile;
        if (cur) useAuthStore.getState().setProfile({ ...cur, household_id: householdId });
      }

      // Get current max sort_order scoped to this household only
      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: name.trim(),
          icon: icon ?? null,
          sort_order: nextOrder,
          household_id: householdId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ id, name, icon }: { id: string; name: string; icon?: string | null }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim(), icon: icon ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: name.trim().toLowerCase(),
          // Scope tag to the user's household so it isn't globally visible to everyone
          household_id: profile?.household_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useTags() {
  const user = useUser();

  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

/** Mark a recipe as cooked right now — updates last_cooked_at */
export function useMarkRecipeCooked() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .update({ last_cooked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Optimistic update
      const now = new Date().toISOString();
      qc.setQueryData([RECIPES_KEY, id], (old: Recipe | undefined) =>
        old ? { ...old, last_cooked_at: now } : old
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Marked as cooked! 🥘', 'success');
    },
    onError: (err: Error) => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast(err.message, 'error');
    },
  });
}

/** Fetch the built-in Surprise Me default recipes (is_default = true, user_id = null). */
export function useDefaultRecipes() {
  const user = useUser();

  return useQuery({
    queryKey: [DEFAULT_RECIPES_KEY],
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_default', true)
        .order('title', { ascending: true });
      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!user,
  });
}

/**
 * Copy a default recipe into the current user's collection.
 * Clears is_default, sets user_id to the current user, and links to their household.
 */
export function useClaimDefaultRecipe() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (defaultRecipeId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch the source default recipe
      const { data: source, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', defaultRecipeId)
        .single();
      if (fetchError) throw fetchError;

      // Read profile fresh so we get the latest household_id
      const profile = useAuthStore.getState().profile;

      // Clone into the user's collection
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          household_id: profile?.household_id ?? null,
          is_default: false,
          title: source.title,
          description: source.description,
          source_url: source.source_url,
          image_url: source.image_url,
          prep_time_minutes: source.prep_time_minutes,
          cook_time_minutes: source.cook_time_minutes,
          total_time_minutes: source.total_time_minutes,
          servings: source.servings,
          ingredients: source.ingredients,
          instructions: source.instructions,
          categories: source.categories,
          tags: source.tags,
          rating: null,
          is_favorite: false,
          season_tags: source.season_tags,
          last_cooked_at: null,
          meal_type: source.meal_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Recipe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe added to your book! 🎉', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
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
        .upload(filename, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path);

      return publicUrl;
    },
  });
}
