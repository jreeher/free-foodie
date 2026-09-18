-- handle_new_user() only ever inserted (user_id, email) into profiles, silently
-- dropping the full_name that signup.tsx already sends via
-- supabase.auth.signUp({ options: { data: { full_name } } }). Every account
-- created since 001_initial.sql has display_name = NULL regardless of what
-- was typed on the signup form.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;
