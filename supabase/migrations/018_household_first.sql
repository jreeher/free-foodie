-- 018_household_first.sql
-- Make all shared data household-scoped by default.

-- ============================================================
-- 1. recipe_books: add household-aware RLS
--    (household_id column already exists from migration 014)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own recipe books" ON public.recipe_books;
CREATE POLICY "Users can view own or household recipe books"
  ON public.recipe_books FOR SELECT
  USING (
    auth.uid() = user_id
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

DROP POLICY IF EXISTS "Users can update own recipe books" ON public.recipe_books;
CREATE POLICY "Users can update own or household recipe books"
  ON public.recipe_books FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

-- recipe_book_items: allow access through household-owned books
DROP POLICY IF EXISTS "Users can view items in own books" ON public.recipe_book_items;
CREATE POLICY "Users can view items in own or household books"
  ON public.recipe_book_items FOR SELECT
  USING (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books
      WHERE user_id = auth.uid()
        OR (household_id IS NOT NULL AND household_id IN (
          SELECT household_id FROM public.profiles
          WHERE user_id = auth.uid() AND household_id IS NOT NULL
        ))
    )
  );

DROP POLICY IF EXISTS "Users can add items to own books" ON public.recipe_book_items;
CREATE POLICY "Users can add items to own or household books"
  ON public.recipe_book_items FOR INSERT
  WITH CHECK (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books
      WHERE user_id = auth.uid()
        OR (household_id IS NOT NULL AND household_id IN (
          SELECT household_id FROM public.profiles
          WHERE user_id = auth.uid() AND household_id IS NOT NULL
        ))
    )
  );

DROP POLICY IF EXISTS "Users can remove items from own books" ON public.recipe_book_items;
CREATE POLICY "Users can remove items from own or household books"
  ON public.recipe_book_items FOR DELETE
  USING (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books
      WHERE user_id = auth.uid()
        OR (household_id IS NOT NULL AND household_id IN (
          SELECT household_id FROM public.profiles
          WHERE user_id = auth.uid() AND household_id IS NOT NULL
        ))
    )
  );

-- ============================================================
-- 2. meal_plans: fix UPDATE/DELETE for all household members
-- ============================================================
DROP POLICY IF EXISTS "Users can update their meal plans" ON public.meal_plans;
CREATE POLICY "Users can update meal plans"
  ON public.meal_plans FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

DROP POLICY IF EXISTS "Users can delete their meal plans" ON public.meal_plans;
CREATE POLICY "Users can delete meal plans"
  ON public.meal_plans FOR DELETE
  USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

-- ============================================================
-- 3. meal_plan_entries: fix ALL for household members
-- ============================================================
DROP POLICY IF EXISTS "Users can manage entries for their meal plans" ON public.meal_plan_entries;
CREATE POLICY "Users can manage meal plan entries"
  ON public.meal_plan_entries FOR ALL
  USING (
    meal_plan_id IN (
      SELECT id FROM public.meal_plans
      WHERE created_by = auth.uid()
        OR (household_id IS NOT NULL AND household_id IN (
          SELECT household_id FROM public.profiles
          WHERE user_id = auth.uid() AND household_id IS NOT NULL
        ))
    )
  );

-- ============================================================
-- 4. grocery_lists: fix UPDATE/DELETE for household members
-- ============================================================
DROP POLICY IF EXISTS "Users can update their grocery lists" ON public.grocery_lists;
CREATE POLICY "Users can update grocery lists"
  ON public.grocery_lists FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

DROP POLICY IF EXISTS "Users can delete their grocery lists" ON public.grocery_lists;
CREATE POLICY "Users can delete grocery lists"
  ON public.grocery_lists FOR DELETE
  USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

-- ============================================================
-- 5. household_day_rules: store meal plan day rules in DB
-- ============================================================
CREATE TABLE IF NOT EXISTS public.household_day_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner')),
  rule_type text NOT NULL CHECK (rule_type IN ('category', 'fixed', 'surpriseMe')),
  label text NOT NULL DEFAULT '',
  fixed_meal text,
  categories text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  max_cook_time integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One rule per (household, day, slot) when in a household
CREATE UNIQUE INDEX IF NOT EXISTS household_day_rules_household_unique
  ON public.household_day_rules (household_id, day_of_week, meal_slot)
  WHERE household_id IS NOT NULL;

-- One rule per (user, day, slot) when solo
CREATE UNIQUE INDEX IF NOT EXISTS household_day_rules_user_unique
  ON public.household_day_rules (user_id, day_of_week, meal_slot)
  WHERE household_id IS NULL;

ALTER TABLE public.household_day_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage day rules"
  ON public.household_day_rules FOR ALL
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

-- ============================================================
-- 6. household_grocery_prefs: store ingredient→aisle mappings in DB
-- ============================================================
CREATE TABLE IF NOT EXISTS public.household_grocery_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  aisle_category text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS household_grocery_prefs_household_unique
  ON public.household_grocery_prefs (household_id, lower(ingredient_name))
  WHERE household_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS household_grocery_prefs_user_unique
  ON public.household_grocery_prefs (user_id, lower(ingredient_name))
  WHERE household_id IS NULL;

ALTER TABLE public.household_grocery_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage grocery prefs"
  ON public.household_grocery_prefs FOR ALL
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND household_id IN (
      SELECT household_id FROM public.profiles
      WHERE user_id = auth.uid() AND household_id IS NOT NULL
    ))
  );

-- ============================================================
-- 7. merge_user_data_into_household
--    Called when a user creates or joins a household.
--    Moves all solo data into the shared household scope.
-- ============================================================
CREATE OR REPLACE FUNCTION public.merge_user_data_into_household(
  p_user_id uuid,
  p_household_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recipes
  UPDATE public.recipes
    SET household_id = p_household_id
  WHERE user_id = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- Recipe books
  UPDATE public.recipe_books
    SET household_id = p_household_id
  WHERE user_id = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- Day rules: if household already has a rule for this (day, slot), drop the duplicate
  DELETE FROM public.household_day_rules solo
  WHERE solo.user_id = p_user_id
    AND solo.household_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.household_day_rules existing
      WHERE existing.household_id = p_household_id
        AND existing.day_of_week = solo.day_of_week
        AND existing.meal_slot = solo.meal_slot
    );
  -- Migrate remaining solo rules to the household
  UPDATE public.household_day_rules
    SET household_id = p_household_id
  WHERE user_id = p_user_id AND household_id IS NULL;

  -- Grocery prefs: if household already has a pref for this ingredient, drop the duplicate
  DELETE FROM public.household_grocery_prefs solo
  WHERE solo.user_id = p_user_id
    AND solo.household_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.household_grocery_prefs existing
      WHERE existing.household_id = p_household_id
        AND lower(existing.ingredient_name) = lower(solo.ingredient_name)
    );
  -- Migrate remaining solo prefs to the household
  UPDATE public.household_grocery_prefs
    SET household_id = p_household_id
  WHERE user_id = p_user_id AND household_id IS NULL;

  -- Meal plans
  UPDATE public.meal_plans
    SET household_id = p_household_id
  WHERE created_by = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- Grocery lists
  UPDATE public.grocery_lists
    SET household_id = p_household_id
  WHERE created_by = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);
END;
$$;
