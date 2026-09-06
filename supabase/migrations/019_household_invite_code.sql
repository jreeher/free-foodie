-- 019_household_invite_code.sql
-- Adds a short alphanumeric join code to households so members can invite
-- others without needing their email address.

-- ============================================================
-- 1. Add invite_code column
-- ============================================================
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- ============================================================
-- 2. Function: generate a unique 6-char code
--    Excludes easily confused characters: O, 0, I, 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_household_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   text;
  attempts int := 0;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.households WHERE invite_code = code) THEN
      RETURN code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate a unique invite code after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Function: regenerate the invite code for the caller's household
-- ============================================================
CREATE OR REPLACE FUNCTION public.regenerate_household_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
  v_code text;
BEGIN
  SELECT household_id INTO v_household_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'You are not in a household';
  END IF;

  v_code := public.generate_household_invite_code();

  UPDATE public.households
  SET invite_code = v_code
  WHERE id = v_household_id;

  RETURN v_code;
END;
$$;

-- ============================================================
-- 4. Function: join a household by code
--    Returns the household_id on success, raises on bad code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_household_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  -- Look up the household (bypasses RLS since caller isn't a member yet)
  SELECT id INTO v_household_id
  FROM public.households
  WHERE upper(trim(invite_code)) = upper(trim(p_code));

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Link the caller's profile to the household
  UPDATE public.profiles
  SET household_id = v_household_id
  WHERE user_id = auth.uid();

  RETURN v_household_id;
END;
$$;

-- ============================================================
-- 5. Backfill codes for existing households
-- ============================================================
UPDATE public.households
SET invite_code = public.generate_household_invite_code()
WHERE invite_code IS NULL;
