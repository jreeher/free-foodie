-- 008_data_fixes.sql
-- Fix: recipe sharing, grocery prefs cloud sync, household plan settings,
--      retroactive data sharing on household join, image cleanup (DB side)

-- ============================================================
-- 1. Household planning preferences
--    Shared planning_mode + meal_slots live here so all household
--    members see the same plan structure. default_servings stays
--    personal (in profiles.preferences).
-- ============================================================
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL
  DEFAULT '{"meal_slots": "dinner_only", "planning_mode": "weekly"}'::jsonb;

-- ============================================================
-- 2. Cloud-synced grocery section preferences
--    Replaces the AsyncStorage-only groceryCategoryStore so that
--    drag-to-categorize preferences survive reinstalls and could
--    eventually be shared household-wide.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_grocery_prefs (
  user_id        UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  store_section   TEXT NOT NULL,
  PRIMARY KEY (user_id, ingredient_name)
);

ALTER TABLE public.user_grocery_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own grocery prefs"
  ON public.user_grocery_prefs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
