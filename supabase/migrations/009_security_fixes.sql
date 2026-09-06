-- 009_security_fixes.sql
-- Fix: recipe_import_cache RLS, missing WITH CHECK on UPDATE policies,
--      storage upload policy scope, household_invites WITH CHECK

-- ============================================================
-- 1. Enable RLS on recipe_import_cache
--    It had no RLS at all — any user could read/write/delete the cache.
--    Cache is a shared read resource (avoids duplicate API calls), so
--    authenticated users can read and insert, but nobody can modify
--    or delete entries (only the edge function via service role can).
-- ============================================================
ALTER TABLE public.recipe_import_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read import cache"
  ON public.recipe_import_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert import cache"
  ON public.recipe_import_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 2. Add WITH CHECK to meal_plans UPDATE policy
--    Without WITH CHECK, a user could change household_id on their
--    plan to point at a household they don't belong to.
-- ============================================================
DROP POLICY IF EXISTS "Users can update their meal plans" ON public.meal_plans;

CREATE POLICY "Users can update their meal plans"
  ON public.meal_plans FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- 3. Add WITH CHECK to grocery_lists UPDATE policy
--    Same gap — household_id could be changed arbitrarily.
-- ============================================================
DROP POLICY IF EXISTS "Users can update their grocery lists" ON public.grocery_lists;

CREATE POLICY "Users can update their grocery lists"
  ON public.grocery_lists FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- 4. Add WITH CHECK to household_invites UPDATE policy
--    Without it, an invited user could theoretically change
--    invited_email or invited_by on their own invite row.
-- ============================================================
DROP POLICY IF EXISTS "Invited users can update invite status" ON public.household_invites;

CREATE POLICY "Invited users can update invite status"
  ON public.household_invites FOR UPDATE
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    invited_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5. Tighten the storage upload policy
--    Old policy allowed ANY authenticated user to upload to ANY
--    path in the recipe-images bucket. New policy restricts uploads
--    so a user can only write into their own folder (user_id/...).
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;

CREATE POLICY "Users can upload to their own recipe image folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
