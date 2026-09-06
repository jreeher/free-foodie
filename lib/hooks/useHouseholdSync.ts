/**
 * useHouseholdSync.ts
 *
 * Syncs local Zustand stores (weekRulesStore, groceryCategoryStore)
 * with the Supabase household_day_rules and household_grocery_prefs tables.
 *
 * Pattern:
 *  - useSyncDayRulesFromDb()   → call in plan/index.tsx once on mount
 *  - useUpsertDayRule()        → call after setSlotRule in DayRuleSheet
 *  - useDeleteDayRule()        → call after clearSlotRule / clearDayRules
 *  - useSyncGroceryPrefsFromDb() → call in grocery/index.tsx once on mount
 *  - useUpsertGroceryPref()    → call after setPreference in grocery/index.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useUser, useProfile } from './useAuth';
import { useWeekRulesStore, DayRule } from '../stores/weekRulesStore';
import { useGroceryCategoryStore } from '../stores/groceryCategoryStore';
import { MealSlot } from '../database.types';

export const DAY_RULES_KEY = 'household_day_rules';
export const GROCERY_PREFS_KEY = 'household_grocery_prefs';

// ─── Day Rules ────────────────────────────────────────────────────────────────

type DbDayRule = {
  id: string;
  day_of_week: number;
  meal_slot: string;
  rule_type: string;
  label: string;
  fixed_meal: string | null;
  categories: string[];
  tags: string[];
  max_cook_time: number | null;
};

function dbRowToRule(row: DbDayRule): DayRule {
  return {
    type: row.rule_type as DayRule['type'],
    label: row.label,
    fixedMeal: row.fixed_meal ?? undefined,
    categories: row.categories,
    tags: row.tags,
    maxCookTime: row.max_cook_time ?? undefined,
  };
}

/**
 * Fetch all day rules from DB and populate the weekRulesStore.
 * On first use (DB empty, store has local rules) pushes local rules up to DB.
 * Call once in plan/index.tsx.
 */
export function useSyncDayRulesFromDb() {
  const user = useUser();
  const profile = useProfile();
  const { rules, setSlotRule, clearDayRules } = useWeekRulesStore();
  const upsertRule = useUpsertDayRule();
  const synced = useRef(false);

  const query = useQuery({
    queryKey: [DAY_RULES_KEY, profile?.household_id ?? user?.id],
    queryFn: async (): Promise<DbDayRule[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('household_day_rules')
        .select('*');
      if (error) throw error;
      return (data ?? []) as DbDayRule[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.data || synced.current) return;
    synced.current = true;

    if (query.data.length === 0) {
      // DB is empty — push local (AsyncStorage) rules up to DB as first-time migration
      for (const [dayStr, dayRules] of Object.entries(rules)) {
        if (!dayRules) continue;
        for (const [slot, rule] of Object.entries(dayRules)) {
          if (rule) {
            upsertRule.mutate({ dayOfWeek: Number(dayStr), slot: slot as MealSlot, rule });
          }
        }
      }
    } else {
      // DB has rules — use DB as source of truth, overwrite local store
      const dbDays = new Set(query.data.map((r) => r.day_of_week));
      // Clear local days that no longer exist in DB
      for (const dayStr of Object.keys(rules)) {
        if (!dbDays.has(Number(dayStr))) clearDayRules(Number(dayStr));
      }
      // Populate store from DB
      for (const row of query.data) {
        setSlotRule(row.day_of_week, row.meal_slot as MealSlot, dbRowToRule(row));
      }
    }
  }, [query.data]);

  return query;
}

/**
 * Upsert a single day rule to the DB.
 */
export function useUpsertDayRule() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();

  return useMutation({
    mutationFn: async ({
      dayOfWeek,
      slot,
      rule,
    }: {
      dayOfWeek: number;
      slot: MealSlot;
      rule: DayRule;
    }) => {
      if (!user) return;
      const householdId = profile?.household_id ?? null;

      // Find existing row
      let findQuery = supabase
        .from('household_day_rules')
        .select('id')
        .eq('day_of_week', dayOfWeek)
        .eq('meal_slot', slot);
      if (householdId) {
        findQuery = findQuery.eq('household_id', householdId);
      } else {
        findQuery = (findQuery as any).eq('user_id', user.id).is('household_id', null);
      }
      const { data: existing } = await findQuery.maybeSingle();

      const payload = {
        user_id: user.id,
        household_id: householdId,
        day_of_week: dayOfWeek,
        meal_slot: slot,
        rule_type: rule.type,
        label: rule.label,
        fixed_meal: rule.fixedMeal ?? null,
        categories: rule.categories,
        tags: rule.tags,
        max_cook_time: rule.maxCookTime ?? null,
        updated_at: new Date().toISOString(),
      };

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from('household_day_rules')
          .update(payload)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('household_day_rules')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DAY_RULES_KEY] }),
  });
}

/**
 * Delete one or all day rules for a given day from the DB.
 * Pass `slot` to delete a specific slot; omit to delete all slots for that day.
 */
export function useDeleteDayRule() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();

  return useMutation({
    mutationFn: async ({
      dayOfWeek,
      slot,
    }: {
      dayOfWeek: number;
      slot?: MealSlot;
    }) => {
      if (!user) return;
      const householdId = profile?.household_id ?? null;

      let query = supabase
        .from('household_day_rules')
        .delete()
        .eq('day_of_week', dayOfWeek);

      if (slot) query = query.eq('meal_slot', slot);

      if (householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = (query as any).eq('user_id', user.id).is('household_id', null);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DAY_RULES_KEY] }),
  });
}

// ─── Grocery Prefs ────────────────────────────────────────────────────────────

/**
 * Fetch all grocery category prefs from DB and populate the groceryCategoryStore.
 * On first use (DB empty) pushes local prefs up.
 * Call once in grocery/index.tsx.
 */
export function useSyncGroceryPrefsFromDb() {
  const user = useUser();
  const profile = useProfile();
  const { preferences, setPreference } = useGroceryCategoryStore();
  const upsertPref = useUpsertGroceryPref();
  const synced = useRef(false);

  const query = useQuery({
    queryKey: [GROCERY_PREFS_KEY, profile?.household_id ?? user?.id],
    queryFn: async (): Promise<{ ingredient_name: string; aisle_category: string }[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('household_grocery_prefs')
        .select('ingredient_name, aisle_category');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.data || synced.current) return;
    synced.current = true;

    if (query.data.length === 0) {
      // Push local prefs to DB on first sync
      Object.entries(preferences).forEach(([name, section]) => {
        upsertPref.mutate({ ingredientName: name, aisleCategory: section });
      });
    } else {
      // DB is authoritative — sync into local store
      for (const row of query.data) {
        setPreference(row.ingredient_name, row.aisle_category as any);
      }
    }
  }, [query.data]);

  return query;
}

/**
 * Upsert a single ingredient→aisle preference to the DB.
 */
export function useUpsertGroceryPref() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();

  return useMutation({
    mutationFn: async ({
      ingredientName,
      aisleCategory,
    }: {
      ingredientName: string;
      aisleCategory: string;
    }) => {
      if (!user) return;
      const householdId = profile?.household_id ?? null;
      const normalizedName = ingredientName.toLowerCase().trim();

      let findQuery = supabase
        .from('household_grocery_prefs')
        .select('id')
        .eq('ingredient_name', normalizedName);
      if (householdId) {
        findQuery = findQuery.eq('household_id', householdId);
      } else {
        findQuery = (findQuery as any).eq('user_id', user.id).is('household_id', null);
      }
      const { data: existing } = await findQuery.maybeSingle();

      const payload = {
        user_id: user.id,
        household_id: householdId,
        ingredient_name: normalizedName,
        aisle_category: aisleCategory,
        updated_at: new Date().toISOString(),
      };

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from('household_grocery_prefs')
          .update(payload)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('household_grocery_prefs')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [GROCERY_PREFS_KEY] }),
  });
}
