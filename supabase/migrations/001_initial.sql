-- ─── Profiles ──────────────────────────────────────────────────────────────
-- Minimal profile row per auth user. No household/preferences fields — Free
-- Foodie has no household concept. Required by lib/stores/authStore.ts and
-- lib/hooks/useAuth.ts, which are kept unchanged from Simmer Down.

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create a profile row on signup. Written with SET search_path = '' and
-- an exception-swallowing block from the start — CLAUDE.md documents Simmer
-- Down's original version of this trigger silently failing without these,
-- requiring a later fix migration. No reason to reintroduce that bug.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Canonical food bank item catalog ──────────────────────────────────────

CREATE TABLE public.food_bank_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL, -- e.g. 'Canned Goods', 'Dry Goods', 'Produce', 'Dairy', 'Protein', 'Other'
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── User's current pantry ──────────────────────────────────────────────────

CREATE TABLE public.user_pantry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_bank_item_id uuid NOT NULL REFERENCES public.food_bank_items(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, food_bank_item_id)
);

-- ─── Recipes ────────────────────────────────────────────────────────────────

CREATE TABLE public.recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source_url text,
  image_url text,
  prep_time_minutes int,
  cook_time_minutes int,
  servings int NOT NULL DEFAULT 4,
  skill_level text CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  ingredients jsonb NOT NULL DEFAULT '[]',
  instructions text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Junction: recipes <-> food bank items ─────────────────────────────────

CREATE TABLE public.recipe_food_bank_items (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_bank_item_id uuid NOT NULL REFERENCES public.food_bank_items(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, food_bank_item_id)
);

-- ─── Ratings ────────────────────────────────────────────────────────────────

CREATE TABLE public.recipe_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

-- ─── Recipe import log/cache ────────────────────────────────────────────────
-- Required by the kept supabase/functions/extract-recipe-url, which reads/
-- writes these for its 20-imports-per-day rate limit and per-URL result cache.

CREATE TABLE public.recipe_import_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_import_cache (
  url_hash text PRIMARY KEY,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.food_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_food_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_import_cache ENABLE ROW LEVEL SECURITY;
-- recipe_import_log/cache: no policies — only the edge functions (service-role
-- key, bypasses RLS) touch these tables.

CREATE POLICY "Anyone can read food bank items" ON public.food_bank_items FOR SELECT USING (true);
CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users can insert recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read recipe food bank items" ON public.recipe_food_bank_items FOR SELECT USING (true);
CREATE POLICY "Recipe owner can manage tags" ON public.recipe_food_bank_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users manage own pantry" ON public.user_pantry FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read ratings" ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON public.recipe_ratings FOR ALL USING (auth.uid() = user_id);

-- ─── Storage: recipe-images bucket ──────────────────────────────────────────
-- Required by the kept lib/hooks/useRecipes.ts's useUploadRecipeImage, which
-- uploads to path "<user_id>/<recipe_id or timestamp>.<ext>".

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read recipe images" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Authenticated users can upload recipe images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recipe-images');
CREATE POLICY "Users can update own recipe images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own recipe images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
