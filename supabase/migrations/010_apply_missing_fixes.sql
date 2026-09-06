-- 010_apply_missing_fixes.sql
-- Idempotent re-application of critical fixes that may not have been
-- pushed to the cloud database yet.  Safe to run multiple times.

-- ============================================================
-- 1. Household planning preferences column
--    Allows all household members to share planning_mode + meal_slots.
-- ============================================================
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL
  DEFAULT '{"meal_slots": "dinner_only", "planning_mode": "weekly"}'::jsonb;

-- ============================================================
-- 2. Allow any authenticated user to CREATE a household
--    (needed so solo users can self-provision one when they first
--     try to add a custom category or change household settings)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;

CREATE POLICY "Authenticated users can create households"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. Fix categories RLS — explicit WITH CHECK for INSERT
--    The old USING-only policy causes INSERT to fail for users
--    whose profile.household_id is NULL (NULL IN (...) = NULL,
--    treated as false by Postgres RLS).
-- ============================================================
DROP POLICY IF EXISTS "Household members can manage their categories" ON public.categories;

CREATE POLICY "Household members can manage their categories"
  ON public.categories FOR ALL
  USING (
    household_id IN (
      SELECT p.household_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.household_id IS NOT NULL
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT p.household_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.household_id IS NOT NULL
    )
  );

-- ============================================================
-- 4. Cloud-synced grocery section preferences table
--    Replaces AsyncStorage-only store so drag-to-categorise
--    preferences survive reinstalls.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_grocery_prefs (
  user_id         UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_name TEXT  NOT NULL,
  store_section   TEXT  NOT NULL,
  PRIMARY KEY (user_id, ingredient_name)
);

ALTER TABLE public.user_grocery_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own grocery prefs" ON public.user_grocery_prefs;

CREATE POLICY "Users manage their own grocery prefs"
  ON public.user_grocery_prefs FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
