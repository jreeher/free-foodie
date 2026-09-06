-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS (table only, policies added after profiles)
-- ============================================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  preferences JSONB NOT NULL DEFAULT '{
    "meal_slots": "dinner_only",
    "planning_mode": "weekly",
    "default_servings": 4
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view household members profiles"
  ON profiles FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HOUSEHOLDS policies (now that profiles exists)
-- ============================================================
CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their household"
  ON households FOR UPDATE
  USING (
    id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- HOUSEHOLD INVITES
-- ============================================================
CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can create invites"
  ON household_invites FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can view their invites"
  ON household_invites FOR SELECT
  USING (
    invited_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
    OR invited_by = auth.uid()
  );

CREATE POLICY "Invited users can update invite status"
  ON household_invites FOR UPDATE
  USING (
    invited_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global categories"
  ON categories FOR SELECT
  USING (household_id IS NULL);

CREATE POLICY "Household members can view their categories"
  ON categories FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can manage their categories"
  ON categories FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

INSERT INTO categories (name, sort_order, icon) VALUES
  ('Pasta', 0, '🍝'),
  ('Rice', 1, '🍚'),
  ('Soup', 2, '🍲'),
  ('Meat', 3, '🥩'),
  ('Seafood', 4, '🐟'),
  ('Vegetarian', 5, '🥦'),
  ('Fancy / Date Night', 6, '✨'),
  ('Appetizers', 7, '🫕'),
  ('Desserts', 8, '🍰'),
  ('Breakfast', 9, '🍳'),
  ('Salads', 10, '🥗'),
  ('Slow Cooker', 11, '🫙'),
  ('Quick (Under 30 min)', 12, '⚡'),
  ('Grilling', 13, '🔥');

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view their tags"
  ON tags FOR SELECT
  USING (
    household_id IS NULL OR
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can manage their tags"
  ON tags FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  image_url TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 4,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  season_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipes"
  ON recipes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Household members can view shared recipes"
  ON recipes FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own recipes"
  ON recipes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET FOR RECIPE IMAGES
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload recipe images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view recipe images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can update their own recipe images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recipe images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);
