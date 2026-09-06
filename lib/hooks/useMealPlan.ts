import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { MealPlan, MealPlanEntry, MealPlanEntryInsert, MealSlot } from '../database.types';
import { useUser, useProfile } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { addDays } from '../utils/dates';
import { DayRule, useWeekRulesStore } from '../stores/weekRulesStore';
import { useAuthStore } from '../stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeSnippet = {
  id: string;
  title: string;
  image_url: string | null;
  total_time_minutes: number | null;
};

export type MealPlanEntryWithRecipe = MealPlanEntry & {
  recipes: RecipeSnippet | null;
};

/** Flat map of "YYYY-MM-DD|slot" → entry, for O(1) lookups in the UI */
export type EntryMap = Record<string, MealPlanEntryWithRecipe>;

// ─── Query keys ───────────────────────────────────────────────────────────────

const MEAL_PLAN_KEY = 'meal_plans';
const MEAL_PLAN_ENTRIES_KEY = 'meal_plan_entries';

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch the meal_plan row for a given weekStart (may be null if not yet created) */
export function useMealPlan(weekStart: string) {
  const user = useUser();

  return useQuery({
    queryKey: [MEAL_PLAN_KEY, user?.id, weekStart],
    queryFn: async (): Promise<MealPlan | null> => {
      if (!user) return null;
      // Use .limit(1) instead of .maybeSingle() — after a household merge both a
      // solo plan (created_by match) and a household plan can be visible for the
      // same week, causing maybeSingle() to throw (multiple rows) instead of
      // returning a row. Prefer the household-linked plan when both exist.
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('week_start_date', weekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as MealPlan | undefined) ?? null;
    },
    enabled: !!user && !!weekStart,
    placeholderData: keepPreviousData,
  });
}

/** Fetch all entries for a plan, joined with recipe snippet */
export function useMealPlanEntries(mealPlanId: string | null | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId],
    queryFn: async (): Promise<MealPlanEntryWithRecipe[]> => {
      if (!mealPlanId) return [];
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('*, recipes(id, title, image_url, total_time_minutes)')
        .eq('meal_plan_id', mealPlanId)
        .order('sort_order');
      if (error) throw error;
      return data as MealPlanEntryWithRecipe[];
    },
    enabled: !!user && !!mealPlanId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Build an EntryMap from a flat entries array.
 * Key format: "YYYY-MM-DD|breakfast" etc.
 */
export function buildEntryMap(entries: MealPlanEntryWithRecipe[]): EntryMap {
  const map: EntryMap = {};
  for (const entry of entries) {
    map[`${entry.date}|${entry.meal_slot}`] = entry;
  }
  return map;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Upsert a meal_plan row for the given week, returning its id */
export function useEnsureMealPlan() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();

  return useMutation({
    mutationFn: async (weekStart: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      // Use .limit(1) instead of .maybeSingle() — after a household merge both a
      // solo plan (created_by match) and a household plan can be visible for the
      // same week, causing maybeSingle() to return null+error rather than a row.
      const { data: rows } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('week_start_date', weekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);

      if (rows && rows.length > 0) return rows[0].id;

      // Create a new plan
      const householdId = profile?.household_id ?? null;
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          week_start_date: weekStart,
          created_by: user.id,
          household_id: householdId,
        })
        .select('id')
        .single();

      // 23505 = unique_violation — a concurrent insert beat us to it, fetch theirs
      if (error?.code === '23505') {
        const { data: fallback } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('week_start_date', weekStart)
          .limit(1);
        if (fallback && fallback.length > 0) return fallback[0].id;
      }

      if (error) throw error;
      return data.id;
    },
    onSuccess: (_, weekStart) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY, user?.id, weekStart] });
    },
  });
}

export type AddEntryParams = {
  weekStart: string;
  date: string;
  slot: MealSlot;
  recipeId?: string;
  customMealName?: string;
  servingsOverride?: number;
};

/** Add a recipe or custom meal to a slot. Creates the plan row if needed. */
export function useAddMealPlanEntry() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();
  const ensurePlan = useEnsureMealPlan();

  return useMutation({
    mutationFn: async (params: AddEntryParams): Promise<MealPlanEntry> => {
      if (!user) throw new Error('Not authenticated');
      if (!params.recipeId && !params.customMealName) {
        throw new Error('Must provide a recipe or a custom meal name');
      }

      const mealPlanId = await ensurePlan.mutateAsync(params.weekStart);

      // Get current max sort_order for this date+slot combo
      const { data: existing } = await supabase
        .from('meal_plan_entries')
        .select('sort_order')
        .eq('meal_plan_id', mealPlanId)
        .eq('date', params.date)
        .eq('meal_slot', params.slot)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const insert: MealPlanEntryInsert = {
        meal_plan_id: mealPlanId,
        date: params.date,
        meal_slot: params.slot,
        recipe_id: params.recipeId ?? null,
        custom_meal_name: params.customMealName ?? null,
        servings_override: params.servingsOverride ?? null,
        sort_order: nextOrder,
      };

      const { data, error } = await supabase
        .from('meal_plan_entries')
        .insert(insert)
        .select()
        .single();

      if (error) throw error;
      return data as MealPlanEntry;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, data.meal_plan_id] });
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Remove an entry from a slot */
export function useRemoveMealPlanEntry() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ entryId, mealPlanId }: { entryId: string; mealPlanId: string }) => {
      const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
      return mealPlanId;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Swap recipe or update servings on an existing entry */
export function useUpdateMealPlanEntry() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      entryId,
      mealPlanId,
      recipeId,
      customMealName,
      servingsOverride,
    }: {
      entryId: string;
      mealPlanId: string;
      recipeId?: string | null;
      customMealName?: string | null;
      servingsOverride?: number | null;
    }) => {
      const { error } = await supabase
        .from('meal_plan_entries')
        .update({
          recipe_id: recipeId,
          custom_meal_name: customMealName,
          servings_override: servingsOverride,
        })
        .eq('id', entryId);
      if (error) throw error;
      return mealPlanId;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Copy all entries from the previous week into the current week */
export function useCopyPreviousWeek() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();
  const ensurePlan = useEnsureMealPlan();

  return useMutation({
    mutationFn: async ({
      currentWeekStart,
      previousWeekStart,
    }: {
      currentWeekStart: string;
      previousWeekStart: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Find previous week's plan. Use .limit(1) instead of .maybeSingle() — a
      // household merge can leave both a solo and a household plan visible for
      // the same week, which would make maybeSingle() throw.
      const { data: prevPlanRows } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('week_start_date', previousWeekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);
      const prevPlan = prevPlanRows?.[0] ?? null;

      if (!prevPlan) throw new Error('No meal plan found for the previous week');

      // Fetch previous entries
      const { data: prevEntries, error: fetchError } = await supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('meal_plan_id', prevPlan.id);

      if (fetchError) throw fetchError;
      if (!prevEntries || prevEntries.length === 0) {
        throw new Error('Previous week has no meals to copy');
      }

      // Get or create current week plan
      const currentPlanId = await ensurePlan.mutateAsync(currentWeekStart);

      // Offset the dates by 7 days
      const newEntries: MealPlanEntryInsert[] = prevEntries.map((e) => ({
        meal_plan_id: currentPlanId,
        date: addDays(e.date, 7),
        meal_slot: e.meal_slot,
        recipe_id: e.recipe_id,
        custom_meal_name: e.custom_meal_name,
        servings_override: e.servings_override,
        sort_order: e.sort_order,
      }));

      const { error: insertError } = await supabase
        .from('meal_plan_entries')
        .insert(newEntries);

      if (insertError) throw insertError;
      return currentPlanId;
    },
    onSuccess: (currentPlanId, { currentWeekStart }) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, currentPlanId] });
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY, user?.id, currentWeekStart] });
      showToast('Previous week copied!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Clear all entries for a given week */
export function useClearWeek() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (mealPlanId: string) => {
      const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('meal_plan_id', mealPlanId);
      if (error) throw error;
      return mealPlanId;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
      showToast('Week cleared', 'info');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

// ─── Generate Meal Plan ────────────────────────────────────────────────────────

export type GenerateParams = {
  weekStart: string;
  dates: string[];
  slots: MealSlot[];
  overwriteExisting: boolean;
};

export function useGenerateMealPlan() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();
  const ensurePlan = useEnsureMealPlan();
  const { rules } = useWeekRulesStore();

  return useMutation({
    mutationFn: async ({ weekStart, dates, slots, overwriteExisting }: GenerateParams): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const profile = useAuthStore.getState().profile;
      const householdId = profile?.household_id ?? null;

      // Load ALL recipes available to this household — includes every member's uploads.
      const recipeQuery = householdId
        ? supabase.from('recipes').select('id, title, categories, tags, total_time_minutes, meal_type, last_cooked_at').eq('household_id', householdId).eq('is_default', false)
        : supabase.from('recipes').select('id, title, categories, tags, total_time_minutes, meal_type, last_cooked_at').eq('user_id', user.id).eq('is_default', false);
      const { data: allRecipes, error } = await recipeQuery;
      if (error) throw error;
      // Filter out recipes tagged "Exclude from Meal Planning"
      const recipes = (allRecipes ?? []).filter(
        (r) => !(r.categories ?? []).includes('Exclude from Meal Planning')
      );

      if (!recipes.length) throw new Error('Add some recipes before generating a plan.');

      // Load Simmer Down Favorites separately — only used for "Surprise Me" rules.
      let favoritesPool = recipes; // fallback to full pool if no book found
      const favBookQuery = householdId
        ? supabase.from('recipe_books').select('id').eq('household_id', householdId).eq('name', 'Simmer Down Favorites').limit(1)
        : supabase.from('recipe_books').select('id').eq('user_id', user.id).eq('name', 'Simmer Down Favorites').limit(1);
      const { data: favBooks } = await favBookQuery;
      const favBookId = favBooks?.[0]?.id ?? null;
      if (favBookId) {
        const { data: bookItems } = await supabase
          .from('recipe_book_items')
          .select('recipe_id')
          .eq('recipe_book_id', favBookId);
        const favIds = new Set((bookItems ?? []).map((i: any) => i.recipe_id));
        const filtered = recipes.filter((r) => favIds.has(r.id));
        if (filtered.length > 0) favoritesPool = filtered;
      }

      // Pre-load pools for any "recipeBook" rules so we only fetch each book once.
      const bookPools: Record<string, typeof recipes> = {};
      const bookRuleIds = new Set<string>();
      for (const dayRules of Object.values(rules)) {
        for (const rule of Object.values(dayRules ?? {})) {
          if (rule?.type === 'recipeBook' && rule.bookId) bookRuleIds.add(rule.bookId);
        }
      }
      for (const bookId of bookRuleIds) {
        const { data: items } = await supabase
          .from('recipe_book_items')
          .select('recipe_id')
          .eq('recipe_book_id', bookId);
        const ids = new Set((items ?? []).map((i: any) => i.recipe_id));
        bookPools[bookId] = recipes.filter((r) => ids.has(r.id));
      }

      const mealPlanId = await ensurePlan.mutateAsync(weekStart);

      const { data: existing } = await supabase
        .from('meal_plan_entries')
        .select('date, meal_slot')
        .eq('meal_plan_id', mealPlanId);

      if (overwriteExisting && existing?.length) {
        await supabase.from('meal_plan_entries').delete().eq('meal_plan_id', mealPlanId);
      }

      const filledSlots = overwriteExisting
        ? new Set<string>()
        : new Set((existing ?? []).map((e) => `${e.date}|${e.meal_slot}`));

      const entriesToInsert: MealPlanEntryInsert[] = [];
      let weekCategoryCounts: Record<string, number> = {};
      const prevSlotCats: Partial<Record<MealSlot, string[]>> = {};
      const usedIds = new Set<string>();

      for (let i = 0; i < dates.length; i++) {
        if (i > 0 && i % 7 === 0) weekCategoryCounts = {};
        const date = dates[i];
        const dayOfWeek = new Date(date + 'T12:00:00').getDay();
        const dayRules = rules[dayOfWeek];

        for (const slot of slots) {
          if (filledSlots.has(`${date}|${slot}`)) continue;

          const rule = dayRules?.[slot];

          // Fixed recurring meal — insert as a custom meal, skip recipe selection
          if (rule?.type === 'fixed' && rule.fixedMeal) {
            entriesToInsert.push({
              meal_plan_id: mealPlanId,
              date,
              meal_slot: slot,
              recipe_id: null,
              custom_meal_name: rule.fixedMeal,
              servings_override: null,
              sort_order: 0,
            });
            continue;
          }

          // Select the recipe pool for this slot based on the rule type
          const pool =
            rule?.type === 'surpriseMe' ? favoritesPool :
            rule?.type === 'recipeBook' && rule.bookId ? (bookPools[rule.bookId] ?? recipes) :
            recipes;

          const recipe = pickRecipe(
            pool,
            rule?.type === 'category' ? rule : undefined,
            weekCategoryCounts,
            prevSlotCats[slot] ?? [],
            usedIds,
            slot
          );
          if (!recipe) continue;

          usedIds.add(recipe.id);
          const cats: string[] = recipe.categories ?? [];
          cats.forEach((c) => { weekCategoryCounts[c] = (weekCategoryCounts[c] ?? 0) + 1; });
          prevSlotCats[slot] = cats;

          entriesToInsert.push({
            meal_plan_id: mealPlanId,
            date,
            meal_slot: slot,
            recipe_id: recipe.id,
            custom_meal_name: null,
            servings_override: null,
            sort_order: 0,
          });
        }
      }

      if (!entriesToInsert.length) {
        throw new Error(
          filledSlots.size > 0
            ? 'All slots are filled. Enable overwrite to regenerate.'
            : 'Could not generate meals. Make sure you have recipes saved.'
        );
      }

      const { error: insertError } = await supabase.from('meal_plan_entries').insert(entriesToInsert);
      if (insertError) throw insertError;

      // Mark each selected recipe as recently planned so future generations prefer variety
      const selectedRecipeIds = [...new Set(
        entriesToInsert.filter((e) => e.recipe_id).map((e) => e.recipe_id as string)
      )];
      if (selectedRecipeIds.length > 0) {
        await supabase
          .from('recipes')
          .update({ last_cooked_at: new Date().toISOString() })
          .in('id', selectedRecipeIds);
      }

      return mealPlanId;
    },
    onSuccess: (mealPlanId, { weekStart }) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY, user?.id, weekStart] });
      showToast('Meal plan generated!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

// ─── Swap two meal slots across different dates ───────────────────────────────

export type SwapSlotsParams = {
  /** Entry the user tapped "Swap Day" on */
  sourceEntry: MealPlanEntryWithRecipe;
  /** Date string (YYYY-MM-DD) the user wants to swap with */
  targetDate: string;
  /** Existing entry on targetDate/same slot, or null if that slot is empty */
  targetEntry: MealPlanEntryWithRecipe | null;
};

export function useSwapMealPlanSlots() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ sourceEntry, targetDate, targetEntry }: SwapSlotsParams) => {
      const mealPlanId = sourceEntry.meal_plan_id;

      if (targetEntry) {
        // Both slots filled — swap the recipes/custom meals between them
        const [r1, r2] = await Promise.all([
          supabase
            .from('meal_plan_entries')
            .update({
              recipe_id: targetEntry.recipe_id,
              custom_meal_name: targetEntry.custom_meal_name,
              servings_override: targetEntry.servings_override,
            })
            .eq('id', sourceEntry.id),
          supabase
            .from('meal_plan_entries')
            .update({
              recipe_id: sourceEntry.recipe_id,
              custom_meal_name: sourceEntry.custom_meal_name,
              servings_override: sourceEntry.servings_override,
            })
            .eq('id', targetEntry.id),
        ]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
      } else {
        // Target slot is empty — simply move the source entry to the target date
        const { error } = await supabase
          .from('meal_plan_entries')
          .update({ date: targetDate })
          .eq('id', sourceEntry.id);
        if (error) throw error;
      }

      return mealPlanId;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
      showToast('Days swapped!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

// ─── Side dishes ──────────────────────────────────────────────────────────────

export function useAddMealPlanEntrySide() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ entry, newSide }: { entry: MealPlanEntryWithRecipe; newSide: string }) => {
      const updatedSides = [...(entry.side_dishes ?? []), newSide.trim()];
      const { error } = await supabase
        .from('meal_plan_entries')
        .update({ side_dishes: updatedSides })
        .eq('id', entry.id);
      if (error) throw error;
      return entry.meal_plan_id;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useRemoveMealPlanEntrySide() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ entry, sideIndex }: { entry: MealPlanEntryWithRecipe; sideIndex: number }) => {
      const updatedSides = (entry.side_dishes ?? []).filter((_, i) => i !== sideIndex);
      const { error } = await supabase
        .from('meal_plan_entries')
        .update({ side_dishes: updatedSides })
        .eq('id', entry.id);
      if (error) throw error;
      return entry.meal_plan_id;
    },
    onSuccess: (mealPlanId) => {
      qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, mealPlanId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

/**
 * In biweekly mode, seed a blank new period with meals that were planned
 * in the predecessor period (week_start_date = weekStart − 7 days) and
 * fall on dates within the new period (date >= weekStart).
 *
 * Silent: no toast emitted. Returns number of entries copied (0 = nothing done).
 */
export function useCarryOverBiweekOverlap() {
  const qc = useQueryClient();
  const user = useUser();
  const ensurePlan = useEnsureMealPlan();

  return useMutation({
    mutationFn: async (weekStart: string): Promise<{ count: number; newPlanId: string }> => {
      if (!user) throw new Error('Not authenticated');

      const predecessorWeekStart = addDays(weekStart, -7);

      // Look up the predecessor plan row
      const { data: predRows } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('week_start_date', predecessorWeekStart)
        .order('household_id', { ascending: true, nullsFirst: false })
        .limit(1);

      if (!predRows || predRows.length === 0) return { count: 0, newPlanId: '' };
      const predecessorPlanId = predRows[0].id;

      // Fetch entries from the predecessor that fall within the new period
      const { data: overlapEntries, error: fetchError } = await supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('meal_plan_id', predecessorPlanId)
        .gte('date', weekStart);

      if (fetchError) throw fetchError;
      if (!overlapEntries || overlapEntries.length === 0) return { count: 0, newPlanId: '' };

      // Get or create the plan row for the new period
      const newPlanId = await ensurePlan.mutateAsync(weekStart);

      // Guard against duplicate inserts — if the new plan already has entries
      // for any of the overlap dates, skip (covers StrictMode double-invocation
      // and back-navigation re-triggers that slip past the useRef dedup).
      const overlapDates = [...new Set(overlapEntries.map((e) => e.date))];
      const { data: existingNewEntries } = await supabase
        .from('meal_plan_entries')
        .select('id')
        .eq('meal_plan_id', newPlanId)
        .in('date', overlapDates)
        .limit(1);
      if (existingNewEntries && existingNewEntries.length > 0) return { count: 0, newPlanId };

      // Insert copies with the new meal_plan_id (same date, slot, recipe, etc.)
      const newEntries: MealPlanEntryInsert[] = overlapEntries.map((e) => ({
        meal_plan_id: newPlanId,
        date: e.date,
        meal_slot: e.meal_slot,
        recipe_id: e.recipe_id ?? null,
        custom_meal_name: e.custom_meal_name ?? null,
        servings_override: e.servings_override ?? null,
        sort_order: e.sort_order,
      }));

      const { error: insertError } = await supabase
        .from('meal_plan_entries')
        .insert(newEntries);

      if (insertError) throw insertError;
      return { count: newEntries.length, newPlanId };
    },
    onSuccess: ({ count, newPlanId }, weekStart) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY, newPlanId] });
        qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY, user?.id, weekStart] });
      }
    },
    onError: (err: Error) => {
      console.warn('[useCarryOverBiweekOverlap] carry-over failed (best-effort):', err.message);
    },
  });
}

function pickRecipe(
  recipes: any[],
  rule: DayRule | undefined,
  categoryCounts: Record<string, number>,
  prevDayCats: string[],
  usedIds: Set<string>,
  slot: string
): any | null {
  if (!recipes.length) return null;

  let pool = rule ? applyRule(recipes, rule) : recipes;
  if (!pool.length) pool = recipes;

  // Filter by meal_type: only include recipes compatible with this slot.
  // meal_type === null means "any slot". meal_type that matches the slot is OK.
  // meal_types like 'beverage'/'appetizer'/'dessert' never auto-fill a main slot.
  const mealTypeFiltered = pool.filter(
    (r) => !r.meal_type || r.meal_type === slot
  );
  if (mealTypeFiltered.length > 0) pool = mealTypeFiltered;

  const fresh = pool.filter((r) => !usedIds.has(r.id));
  if (fresh.length) pool = fresh;

  const constrained = pool.filter((r) => {
    const cats: string[] = r.categories ?? [];
    if (cats.some((c) => prevDayCats.includes(c))) return false;
    if (cats.some((c) => (categoryCounts[c] ?? 0) >= 2)) return false;
    return true;
  });

  const final = constrained.length ? constrained : pool;

  // Sort so recipes not recently planned appear first (null last_cooked_at = never planned = highest priority)
  const sorted = [...final].sort((a, b) => {
    if (!a.last_cooked_at && !b.last_cooked_at) return 0;
    if (!a.last_cooked_at) return -1;
    if (!b.last_cooked_at) return 1;
    return new Date(a.last_cooked_at).getTime() - new Date(b.last_cooked_at).getTime();
  });

  // Pick randomly from the "least recently planned" half to keep some variety
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  return topHalf[Math.floor(Math.random() * topHalf.length)] ?? null;
}

function applyRule(recipes: any[], rule: DayRule): any[] {
  return recipes.filter((r) => {
    if (rule.categories.length) {
      const cats: string[] = r.categories ?? [];
      if (!cats.some((c) => rule.categories.includes(c))) return false;
    }
    if (rule.tags.length) {
      const tags: string[] = r.tags ?? [];
      if (!tags.some((t) => rule.tags.includes(t))) return false;
    }
    if (rule.maxCookTime) {
      if (r.total_time_minutes != null && r.total_time_minutes > rule.maxCookTime) return false;
    }
    return true;
  });
}
