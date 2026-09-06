import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { RecipeBook } from '../database.types';
import { useUser, useProfile } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { imageUriToArrayBuffer } from '../utils/webCompat';

export const RECIPE_BOOKS_KEY = 'recipe_books';

export interface RecipeBookWithCount extends RecipeBook {
  recipe_count: number;
  recipe_ids: string[];
}

export function useRecipeBooks() {
  const user = useUser();

  return useQuery({
    queryKey: [RECIPE_BOOKS_KEY, user?.id],
    queryFn: async (): Promise<RecipeBookWithCount[]> => {
      const { data, error } = await supabase
        .from('recipe_books')
        .select('*, recipe_book_items(recipe_id)')
        .order('sort_order');
      if (error) throw error;

      return (data ?? []).map((book: any) => ({
        id: book.id,
        user_id: book.user_id,
        household_id: book.household_id,
        name: book.name,
        description: book.description,
        sort_order: book.sort_order,
        is_default: book.is_default,
        cover_color_index: book.cover_color_index ?? null,
        cover_image_url: book.cover_image_url ?? null,
        created_at: book.created_at,
        recipe_count: book.recipe_book_items?.length ?? 0,
        recipe_ids: (book.recipe_book_items ?? []).map((i: any) => i.recipe_id),
      }));
    },
    enabled: !!user,
  });
}

export function useUpdateRecipeBookCover() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      id,
      cover_color_index,
      cover_image_url,
    }: {
      id: string;
      cover_color_index: number | null;
      cover_image_url?: string | null;
    }) => {
      const updates: Record<string, unknown> = { cover_color_index };
      if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
      const { error } = await supabase.from('recipe_books').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUploadBookCoverImage() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ bookId, uri }: { bookId: string; uri: string }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const { arrayBuffer, ext } = await imageUriToArrayBuffer(uri);
      const filename = `${user.id}/book-covers/${bookId}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, arrayBuffer, { contentType, upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path);

      const { error: updateError } = await supabase
        .from('recipe_books')
        .update({ cover_image_url: publicUrl, cover_color_index: null })
        .eq('id', bookId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] });
      showToast('Cover image updated!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useCreateRecipeBook() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('recipe_books')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 2;

      const { data, error } = await supabase
        .from('recipe_books')
        .insert({
          user_id: user.id,
          name: name.trim(),
          sort_order: nextOrder,
          household_id: profile?.household_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as RecipeBook;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] });
      showToast('Recipe book created!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useRenameRecipeBook() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('recipe_books')
        .update({ name: name.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useDeleteRecipeBook() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipe_books').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] });
      showToast('Recipe book deleted', 'info');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useAddRecipeToBook() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ bookId, recipeId }: { bookId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_book_items')
        .insert({ recipe_book_id: bookId, recipe_id: recipeId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useRemoveRecipeFromBook() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ bookId, recipeId }: { bookId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_book_items')
        .delete()
        .eq('recipe_book_id', bookId)
        .eq('recipe_id', recipeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] }),
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
