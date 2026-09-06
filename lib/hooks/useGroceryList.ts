import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../supabase';
import {
  GroceryList,
  GroceryListItem,
  GroceryListItemInsert,
} from '../database.types';
import { useUser, useProfile } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { aggregateIngredients } from '../utils/groceryAggregation';
import { parseAmount, formatAmount } from '../utils/fractions';
import { AISLE_TO_STORE_SECTION, StoreSection } from '../theme';
import { useGroceryCategoryStore } from '../stores/groceryCategoryStore';

const GROCERY_PREFS_KEY = 'grocery_prefs';

// ─── Query keys ───────────────────────────────────────────────────────────────

const GROCERY_LIST_KEY = 'grocery_lists';
const GROCERY_ITEMS_KEY = 'grocery_list_items';

// ─── Fetch hooks ──────────────────────────────────────────────────────────────

/** Fetch the grocery_list row for a given weekStart (may be null) */
export function useGroceryList(weekStart: string) {
  const user = useUser();

  return useQuery({
    queryKey: [GROCERY_LIST_KEY, user?.id, weekStart],
    queryFn: async (): Promise<GroceryList | null> => {
      if (!user) return null;
      // Use .limit(1) instead of .maybeSingle() — after a household merge both a
      // solo list (created_by match) and a household list can be visible for the
      // same week, causing maybeSingle() to throw (multiple rows) instead of
      // returning a row. Prefer the household-linked list when both exist.
      const { data, error } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('week_start_date', weekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as GroceryList | undefined) ?? null;
    },
    enabled: !!user && !!weekStart,
  });
}

/** Fetch all items for a grocery list */
export function useGroceryListItems(listId: string | null | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: [GROCERY_ITEMS_KEY, listId],
    queryFn: async (): Promise<GroceryListItem[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('grocery_list_items')
        .select('*')
        .eq('grocery_list_id', listId)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data as GroceryListItem[];
    },
    enabled: !!user && !!listId,
  });
}

// ─── Real-time sync ───────────────────────────────────────────────────────────

/**
 * Subscribe to real-time changes on grocery_list_items for a given list.
 * When a household member checks/unchecks an item, the UI updates automatically.
 */
export function useGroceryListRealtime(listId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!listId) return;

    const channel = supabase
      .channel(`grocery_items:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_list_items',
          filter: `grocery_list_id=eq.${listId}`,
        },
        () => {
          // Invalidate and refetch on any change
          qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, qc]);
}

// ─── Cloud-synced grocery section preferences ─────────────────────────────────

/**
 * Persist an ingredient→section mapping to Supabase AND update the local cache.
 * Called whenever the user drags an item into a section.
 */
export function useSaveGroceryPref() {
  const qc = useQueryClient();
  const user = useUser();
  const { setPreference } = useGroceryCategoryStore();

  return useMutation({
    mutationFn: async ({ name, section }: { name: string; section: StoreSection }) => {
      if (!user) return;
      const { error } = await supabase
        .from('user_grocery_prefs')
        .upsert(
          {
            user_id: user.id,
            ingredient_name: name.toLowerCase().trim(),
            store_section: section,
          },
          { onConflict: 'user_id,ingredient_name' }
        );
      if (error) throw error;
    },
    onMutate: ({ name, section }) => {
      // Optimistic: update local cache immediately so the UI is instant
      setPreference(name, section);
    },
    onSuccess: (_, { name, section }) => {
      // Ensure local cache and React Query cache are both fresh
      setPreference(name, section);
      qc.invalidateQueries({ queryKey: [GROCERY_PREFS_KEY, user?.id] });
    },
    // Silently ignore errors — pref sync failure is non-critical
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Generate a grocery list from the current week's meal plan.
 * Fetches all meal plan entries + their recipe ingredients, aggregates,
 * then inserts into grocery_list_items.
 */
export function useGenerateGroceryList() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();
  const { showToast } = useUIStore();
  return useMutation({
    mutationFn: async ({
      weekStart,
      mealPlanId,
      replaceExisting = false,
    }: {
      weekStart: string;
      mealPlanId: string | null;
      replaceExisting?: boolean;
    }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      if (!mealPlanId) throw new Error('No meal plan for this week yet');

      const householdId = profile?.household_id ?? null;

      // Get or create the grocery list row. Use .limit(1) instead of
      // .maybeSingle() — a household merge can leave both a solo and a
      // household list visible for the same week, which would make
      // maybeSingle() throw.
      let listId: string;
      const { data: existingRows } = await supabase
        .from('grocery_lists')
        .select('id')
        .eq('week_start_date', weekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      if (existing) {
        listId = existing.id;
        if (replaceExisting) {
          // Delete all non-custom items to regenerate
          await supabase
            .from('grocery_list_items')
            .delete()
            .eq('grocery_list_id', listId)
            .eq('is_custom', false);
        }
      } else {
        const { data: created, error: createError } = await supabase
          .from('grocery_lists')
          .insert({
            week_start_date: weekStart,
            meal_plan_id: mealPlanId,
            created_by: user.id,
            household_id: householdId,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        listId = created.id;
      }

      // Fetch meal plan entries with recipe data
      const { data: entries, error: entriesError } = await supabase
        .from('meal_plan_entries')
        .select('servings_override, recipes(id, servings, ingredients)')
        .eq('meal_plan_id', mealPlanId)
        .not('recipe_id', 'is', null);

      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        throw new Error('No recipes in your meal plan for this week');
      }

      // Build aggregation input
      const recipeEntries = (entries as any[])
        .filter((e) => e.recipes)
        .map((e) => ({
          ingredients: e.recipes.ingredients ?? [],
          servings: e.recipes.servings ?? 1,
          servingsOverride: e.servings_override,
        }));

      const aggregated = aggregateIngredients(recipeEntries);

      if (aggregated.length === 0) {
        throw new Error('No ingredients found in this week\'s recipes');
      }

      // Fetch cloud-synced ingredient preferences (survive reinstall / new device)
      const { data: cloudPrefsData } = await supabase
        .from('user_grocery_prefs')
        .select('ingredient_name, store_section')
        .eq('user_id', user.id);

      const cloudPrefs: Record<string, StoreSection> = {};
      for (const row of cloudPrefsData ?? []) {
        cloudPrefs[row.ingredient_name.toLowerCase()] = row.store_section as StoreSection;
      }

      // Hydrate the in-memory cache so the UI responds instantly for this session
      useGroceryCategoryStore.getState().hydrate(cloudPrefs);

      // Insert aggregated items — prefer cloud prefs, then aisle map
      const inserts: GroceryListItemInsert[] = aggregated.map((item, i) => {
        const key = item.name.toLowerCase().trim();
        const savedSection: StoreSection | null = cloudPrefs[key] ?? null;
        const mappedSection: StoreSection =
          savedSection ??
          (AISLE_TO_STORE_SECTION[item.aisle_category] as StoreSection | undefined) ??
          'Other';
        return {
          grocery_list_id: listId,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          aisle_category: mappedSection,
          is_checked: false,
          is_custom: false,
          sort_order: i,
        };
      });

      const { error: insertError } = await supabase
        .from('grocery_list_items')
        .insert(inserts);

      if (insertError) throw insertError;

      return listId;
    },
    onSuccess: (listId, { weekStart }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_LIST_KEY, user?.id, weekStart] });
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      showToast('Grocery list generated!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Toggle the checked state of a grocery item (optimistic) */
export function useToggleGroceryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, listId, checked }: { itemId: string; listId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('grocery_list_items')
        .update({ is_checked: checked })
        .eq('id', itemId);
      if (error) throw error;
      return { listId, itemId, checked };
    },
    onMutate: async ({ itemId, listId, checked }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      qc.setQueryData([GROCERY_ITEMS_KEY, listId], (old: GroceryListItem[] | undefined) =>
        old?.map((item) =>
          item.id === itemId ? { ...item, is_checked: checked } : item
        )
      );
    },
    onError: (_err, { listId }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
    },
  });
}

/** Add a custom item to the grocery list */
export function useAddCustomGroceryItem() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      listId,
      weekStart,
      name,
      amount,
      unit,
      aisleCategory,
    }: {
      listId: string | null;
      weekStart: string;
      name: string;
      amount?: string;
      unit?: string;
      aisleCategory?: string;
    }): Promise<{ listId: string; item: GroceryListItem }> => {
      if (!user) throw new Error('Not authenticated');

      let resolvedListId = listId;

      // Create list if it doesn't exist yet
      if (!resolvedListId) {
        const { data: created, error: createError } = await supabase
          .from('grocery_lists')
          .insert({
            week_start_date: weekStart,
            created_by: user.id,
          })
          .select('id')
          .single();
        if (createError) throw createError;
        resolvedListId = created.id;
      }

      const { data, error } = await supabase
        .from('grocery_list_items')
        .insert({
          grocery_list_id: resolvedListId,
          name: name.trim(),
          amount: amount?.trim() || null,
          unit: unit?.trim() || null,
          aisle_category: aisleCategory ?? 'Other',
          is_custom: true,
          is_checked: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { listId: resolvedListId, item: data as GroceryListItem };
    },
    onSuccess: ({ listId }, { weekStart }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      qc.invalidateQueries({ queryKey: [GROCERY_LIST_KEY] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Remove a single grocery item */
export function useRemoveGroceryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, listId }: { itemId: string; listId: string }) => {
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return listId;
    },
    onMutate: async ({ itemId, listId }) => {
      await qc.cancelQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      qc.setQueryData([GROCERY_ITEMS_KEY, listId], (old: GroceryListItem[] | undefined) =>
        old?.filter((item) => item.id !== itemId)
      );
    },
    onError: (_err, { listId }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
    },
  });
}

/**
 * Add all ingredients from a single recipe to this week's grocery list,
 * scaled to the given servings. Creates the grocery list if it doesn't exist.
 */
export function useAddRecipeToGroceryList() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();
  const profile = useProfile();

  return useMutation({
    mutationFn: async ({
      weekStart,
      recipeId,
      recipeTitle,
      ingredients,
      recipeServings,
      targetServings,
    }: {
      weekStart: string;
      recipeId: string;
      recipeTitle: string;
      ingredients: { name: string; amount: string; unit: string; aisle_category: string }[];
      recipeServings: number;
      targetServings: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const multiplier = recipeServings > 0 ? targetServings / recipeServings : 1;

      // Get or create grocery list. Use .limit(1) instead of .maybeSingle() —
      // a household merge can leave both a solo and a household list visible
      // for the same week, which would make maybeSingle() throw.
      let listId: string;
      const { data: existingRows } = await supabase
        .from('grocery_lists')
        .select('id')
        .eq('week_start_date', weekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);
      const existing = existingRows?.[0] ?? null;

      if (existing) {
        listId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from('grocery_lists')
          .insert({
            week_start_date: weekStart,
            created_by: user.id,
            household_id: profile?.household_id ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        listId = created.id;
      }

      // Get current item count for sort_order offset
      const { count } = await supabase
        .from('grocery_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('grocery_list_id', listId);

      const offset = count ?? 0;

      // Scale and insert ingredients
      const inserts: GroceryListItemInsert[] = ingredients
        .filter((i) => i.name?.trim())
        .map((i, idx) => {
          let scaledAmount: string | null = null;
          if (i.amount?.trim()) {
            const parsed = parseAmount(i.amount);
            scaledAmount = parsed > 0 ? formatAmount(parsed * multiplier) : i.amount;
          }
          // Map the detailed ingredient aisle category to a simplified store section
          // so it lands in the right group in the grocery list.
          const storeSection: StoreSection =
            (AISLE_TO_STORE_SECTION[i.aisle_category] as StoreSection | undefined) ?? 'Other';
          return {
            grocery_list_id: listId,
            name: i.name.trim(),
            amount: scaledAmount,
            unit: i.unit?.trim() || null,
            aisle_category: storeSection,
            is_custom: false,
            is_checked: false,
            sort_order: offset + idx,
          };
        });

      const { error: insertError } = await supabase
        .from('grocery_list_items')
        .insert(inserts);

      if (insertError) throw insertError;
      return listId;
    },
    onSuccess: (listId, { recipeTitle, weekStart }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      qc.invalidateQueries({ queryKey: [GROCERY_LIST_KEY] });
      showToast(`${recipeTitle} added to grocery list`, 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Remove all checked items from a grocery list */
export function useClearCheckedItems() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('grocery_list_items')
        .delete()
        .eq('grocery_list_id', listId)
        .eq('is_checked', true);
      if (error) throw error;
      return listId;
    },
    onSuccess: (listId) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      showToast('Checked items removed', 'info');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Move a grocery item to a different store section (aisle_category) */
export function useUpdateGroceryItemCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      listId,
      category,
    }: {
      itemId: string;
      listId: string;
      category: string;
    }) => {
      const { error } = await supabase
        .from('grocery_list_items')
        .update({ aisle_category: category })
        .eq('id', itemId);
      if (error) throw error;
      return { listId, itemId, category };
    },
    onMutate: async ({ itemId, listId, category }) => {
      await qc.cancelQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
      qc.setQueryData([GROCERY_ITEMS_KEY, listId], (old: GroceryListItem[] | undefined) =>
        old?.map((item) =>
          item.id === itemId ? { ...item, aisle_category: category } : item
        )
      );
    },
    onError: (_err, { listId }) => {
      qc.invalidateQueries({ queryKey: [GROCERY_ITEMS_KEY, listId] });
    },
  });
}

/** Clear all items and delete the grocery list */
export function useDeleteGroceryList() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ listId, weekStart }: { listId: string; weekStart: string }) => {
      const { error } = await supabase
        .from('grocery_lists')
        .delete()
        .eq('id', listId);
      if (error) throw error;
      return weekStart;
    },
    onSuccess: (weekStart) => {
      qc.removeQueries({ queryKey: [GROCERY_ITEMS_KEY] });
      qc.invalidateQueries({ queryKey: [GROCERY_LIST_KEY, user?.id, weekStart] });
      showToast('Grocery list cleared', 'info');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}
