-- 007_fixes.sql
-- Fix: signup trigger robustness, households INSERT policy,
--      categories RLS, rename "Fancy / Date Night" → "Fancy"

-- ============================================================
-- 1. Robust handle_new_user trigger
--    • Fully-qualified table names (SET search_path = '')
--    • COALESCE for nullable email (social auth)
--    • ON CONFLICT DO NOTHING prevents duplicate-key errors
--    • EXCEPTION block so trigger never blocks user creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block auth.users INSERT
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Allow authenticated users to CREATE households
--    (needed so users without a household can self-provision one
--     when they first try to add a custom category)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;

CREATE POLICY "Authenticated users can create households"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. Fix categories FOR ALL policy
--    Old USING-only policy is silently broken for INSERT on
--    PostgreSQL 15+ Supabase because WITH CHECK defaults to
--    USING but the subquery returns NULL for users whose
--    profile.household_id IS NULL → INSERT rejected.
--    Add explicit WITH CHECK and guard against NULL household_id.
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
-- 4. Rename "Fancy / Date Night" → "Fancy"
-- ============================================================
UPDATE public.categories
SET name = 'Fancy'
WHERE name = 'Fancy / Date Night';
