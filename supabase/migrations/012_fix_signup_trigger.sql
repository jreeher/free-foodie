-- 012_fix_signup_trigger.sql
-- The handle_new_user trigger from migration 001 was missing SET search_path,
-- causing silent failures in Supabase's SECURITY DEFINER context. New signups
-- got no profile row, breaking the entire app for new users.
-- This is the version from 007_fixes.sql that was never applied to the cloud DB.

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
  -- Never block auth.users INSERT even if profile creation fails
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
