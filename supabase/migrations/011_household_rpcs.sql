-- 011_household_rpcs.sql
-- SECURITY DEFINER functions for household write operations.
--
-- Root cause: auth.uid() inside RLS WITH CHECK/USING expressions can return
-- NULL in certain React Native / Supabase JS session states (token refresh
-- race, AsyncStorage timing), even though the same JWT works for reads.
-- Moving the auth check into SECURITY DEFINER functions keeps the
-- authorization logic correct (we still use auth.uid() in WHERE clauses)
-- while avoiding the RLS evaluation path that is misbehaving.

-- ============================================================
-- 1. Create a household and link it to the calling user (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_household_for_user(household_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Insert the new household
  INSERT INTO households (name)
  VALUES (household_name)
  RETURNING id INTO new_id;

  -- Link the caller's profile to this household
  UPDATE profiles
  SET household_id = new_id
  WHERE user_id = auth.uid();

  RETURN new_id;
END;
$$;

-- ============================================================
-- 2. Merge-update household preferences (JSONB patch)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_household_preferences(prefs JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE households
  SET preferences = COALESCE(preferences, '{}'::jsonb) || prefs
  WHERE id = (
    SELECT household_id
    FROM profiles
    WHERE user_id = auth.uid()
      AND household_id IS NOT NULL
    LIMIT 1
  );
END;
$$;

-- ============================================================
-- 3. Merge-update profile preferences (JSONB patch)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_preferences(prefs JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET preferences = COALESCE(preferences, '{}'::jsonb) || prefs
  WHERE user_id = auth.uid();
END;
$$;

-- ============================================================
-- 4. Grant EXECUTE only to authenticated users
-- ============================================================
REVOKE ALL ON FUNCTION public.create_household_for_user(TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_household_preferences(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_preferences(JSONB)     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_household_for_user(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_household_preferences(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_preferences(JSONB)     TO authenticated;
