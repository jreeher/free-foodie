# Biweekly Carry-Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a biweekly plan period opens blank, automatically seed it with the meals from the previous plan that overlap into the new period (the second week of the previous biweekly).

**Architecture:** A new `useCarryOverBiweekOverlap` mutation in `useMealPlan.ts` looks up the predecessor plan (`week_start_date = weekStart − 7 days`), copies any of its entries dated on or after the new `weekStart` into the new plan row, then invalidates the React Query cache. The plan screen triggers this mutation automatically whenever biweekly mode is active, the current period has no entries, and a `useRef<Set<string>>` confirms we haven't already attempted carry-over for this `weekStart` (preventing re-trigger after a manual clear).

**Tech Stack:** React Native / Expo Router, TanStack Query (`useMutation`), Supabase JS client, TypeScript

---

### Task 1: Add `useCarryOverBiweekOverlap` to useMealPlan.ts

**Files:**
- Modify: `lib/hooks/useMealPlan.ts`

**Context you need to know:**
- `addDays(dateStr, n)` is imported from `'../utils/dates'` — already imported in this file.
- `useEnsureMealPlan()` is a mutation hook defined earlier in the same file. Call `.mutateAsync(weekStart)` on its result to get/create a plan row and return its `id`.
- `MEAL_PLAN_KEY` and `MEAL_PLAN_ENTRIES_KEY` are module-level string constants already defined at the top of this file.
- `MealPlanEntryInsert` is imported from `'../database.types'` — already imported.
- `useUser` is imported from `'./useAuth'` — already imported.
- `supabase` is imported from `'../supabase'` — already imported.

- [ ] **Step 1: Add the export at the bottom of `lib/hooks/useMealPlan.ts`**

Paste this entire function at the very end of the file (after `useSwapMealPlanSlots`'s closing brace and before `pickRecipe`/`applyRule` helpers — or after those helpers, either is fine):

```ts
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
    mutationFn: async (weekStart: string): Promise<number> => {
      if (!user) return 0;

      const predecessorWeekStart = addDays(weekStart, -7);

      // Look up the predecessor plan row
      const { data: predRows } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('week_start_date', predecessorWeekStart)
        .limit(1);

      if (!predRows || predRows.length === 0) return 0;
      const predecessorPlanId = predRows[0].id;

      // Fetch entries from the predecessor that fall within the new period
      const { data: overlapEntries, error: fetchError } = await supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('meal_plan_id', predecessorPlanId)
        .gte('date', weekStart);

      if (fetchError) throw fetchError;
      if (!overlapEntries || overlapEntries.length === 0) return 0;

      // Get or create the plan row for the new period
      const newPlanId = await ensurePlan.mutateAsync(weekStart);

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
      return newEntries.length;
    },
    onSuccess: (count, weekStart) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: [MEAL_PLAN_ENTRIES_KEY] });
        qc.invalidateQueries({ queryKey: [MEAL_PLAN_KEY, user?.id, weekStart] });
      }
    },
    // Silent on error — carry-over is best-effort, don't surface to user
    onError: () => {},
  });
}
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors mentioning `useMealPlan.ts`. (Unrelated pre-existing errors elsewhere are fine.)

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useMealPlan.ts
git commit -m "feat: add useCarryOverBiweekOverlap mutation for biweekly seed"
```

---

### Task 2: Wire auto-trigger in the plan screen

**Files:**
- Modify: `app/(tabs)/plan/index.tsx`

**Context you need to know:**
- The file already imports `useRef` from `'react'`.
- `addDays` needs to be imported — it is NOT currently imported in `plan/index.tsx`. Add it to the existing import from `'../../../lib/utils/dates'`.
- `useCarryOverBiweekOverlap` needs to be imported from `'../../../lib/hooks/useMealPlan'` — add it to the existing named import block for that module.
- `planLoading` and `entriesLoading` are already declared in the file (from `useMealPlan` and `useMealPlanEntries` hooks respectively).
- `entries` is already declared as `data: entries = []` from `useMealPlanEntries`.
- `planningMode` is already declared: `const planningMode = household?.preferences?.planning_mode ?? profile?.preferences?.planning_mode ?? 'weekly'`.
- `weekStart` is already the state variable controlling the current period.

- [ ] **Step 1: Add `useCarryOverBiweekOverlap` to the useMealPlan import**

Find the existing import block that already imports from `'../../../lib/hooks/useMealPlan'`. It currently looks like:

```ts
import {
  useMealPlan,
  useMealPlanEntries,
  buildEntryMap,
  useAddMealPlanEntry,
  useRemoveMealPlanEntry,
  useCopyPreviousWeek,
  useClearWeek,
  useGenerateMealPlan,
  useSwapMealPlanSlots,
  MealPlanEntryWithRecipe,
} from '../../../lib/hooks/useMealPlan';
```

Add `useCarryOverBiweekOverlap` to that list:

```ts
import {
  useMealPlan,
  useMealPlanEntries,
  buildEntryMap,
  useAddMealPlanEntry,
  useRemoveMealPlanEntry,
  useCopyPreviousWeek,
  useClearWeek,
  useGenerateMealPlan,
  useSwapMealPlanSlots,
  useCarryOverBiweekOverlap,
  MealPlanEntryWithRecipe,
} from '../../../lib/hooks/useMealPlan';
```

- [ ] **Step 2: Instantiate the hook and the dedup ref**

Find the block where the other mutation hooks are instantiated (around line 110–115 of the current file):

```ts
  const addEntry = useAddMealPlanEntry();
  const removeEntry = useRemoveMealPlanEntry();
  const copyPrevious = useCopyPreviousWeek();
  const clearWeek = useClearWeek();
  const generatePlan = useGenerateMealPlan();
  const swapSlots = useSwapMealPlanSlots();
```

Add the carry-over hook and its dedup ref immediately after that block:

```ts
  const carryOverBiweek = useCarryOverBiweekOverlap();
  /** Track which weekStart values have already had carry-over attempted so we
   *  don't re-trigger after the user manually clears the week. */
  const carryOverAttemptedRef = useRef<Set<string>>(new Set());
```

- [ ] **Step 3: Add the auto-trigger effect**

Find the existing effect that auto-fills fixed meal rules (it starts with `useEffect(() => { if (!plan?.id) return;`). Add the new carry-over effect **directly before** that existing effect:

```ts
  // In biweekly mode, seed blank periods with overlap meals from the predecessor plan.
  // Runs once per weekStart (deduped via ref) to avoid re-triggering after manual clears.
  useEffect(() => {
    if (planningMode !== 'biweekly') return;
    if (planLoading || entriesLoading) return;
    if (entries.length > 0) return;
    if (carryOverAttemptedRef.current.has(weekStart)) return;

    carryOverAttemptedRef.current.add(weekStart);
    carryOverBiweek.mutate(weekStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningMode, planLoading, entriesLoading, entries.length, weekStart]);
```

- [ ] **Step 4: Verify the file compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors introduced.

- [ ] **Step 5: Manual verification**

To test without waiting for a real biweekly cycle:

1. Switch to **biweekly** mode in Settings.
2. On the plan screen, note your current `weekStart` (e.g. `2026-05-27`).
3. Add at least one meal to the **second week** of the current biweekly (e.g. a date 7+ days after weekStart).
4. Navigate **forward** once (chevron right) — `weekStart` advances by 7 days to the next period.
5. The new period should now show the meal(s) you added in step 3 already populated.
6. Navigate back — the original plan is unchanged.
7. Navigate forward again — the carry-over does NOT re-trigger (dedup ref prevents it).

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/plan/index.tsx
git commit -m "feat: auto carry-over overlap meals when biweekly period opens blank"
```

---

### Task 3: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Trigger Vercel web deploy**

```bash
npx vercel --prod --yes 2>&1
```

Expected: deployment URL printed, status Ready.
