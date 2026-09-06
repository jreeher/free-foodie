-- Recipe books: named folders for organizing recipes

CREATE TABLE IF NOT EXISTS public.recipe_books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Many-to-many: recipes <-> recipe_books
CREATE TABLE IF NOT EXISTS public.recipe_book_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_book_id uuid NOT NULL REFERENCES public.recipe_books(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(recipe_book_id, recipe_id)
);

ALTER TABLE public.recipe_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_book_items ENABLE ROW LEVEL SECURITY;

-- RLS: recipe_books
CREATE POLICY "Users can view own recipe books"
  ON public.recipe_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create recipe books"
  ON public.recipe_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipe books"
  ON public.recipe_books FOR UPDATE
  USING (auth.uid() = user_id);

-- Default books (is_default = true) cannot be deleted
CREATE POLICY "Users can delete own non-default recipe books"
  ON public.recipe_books FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- RLS: recipe_book_items (scoped through the parent book)
CREATE POLICY "Users can view items in own books"
  ON public.recipe_book_items FOR SELECT
  USING (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to own books"
  ON public.recipe_book_items FOR INSERT
  WITH CHECK (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from own books"
  ON public.recipe_book_items FOR DELETE
  USING (
    recipe_book_id IN (
      SELECT id FROM public.recipe_books WHERE user_id = auth.uid()
    )
  );

-- Function: create default recipe books for a given user.
-- Idempotent — skips if books already exist for that user.
CREATE OR REPLACE FUNCTION public.create_default_recipe_books(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_book_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_books WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Starter Recipes (contains the built-in default recipes)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, 'Starter Recipes', 'Curated recipes to get you cooking', 0, true)
  RETURNING id INTO starter_book_id;

  INSERT INTO public.recipe_book_items (recipe_book_id, recipe_id)
  SELECT starter_book_id, id FROM public.recipes WHERE is_default = true;

  -- My Recipes (blank to start)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, 'My Recipes', 'Your personal recipe collection', 1, true);
END;
$$;

-- Trigger: create default books whenever a new profile row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_profile_books()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_default_recipe_books(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_books ON public.profiles;
CREATE TRIGGER on_profile_created_create_books
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_books();

-- Seed default books for existing users
SELECT public.create_default_recipe_books('68f52e14-b021-4ee7-aad9-24545ab59215'); -- Jordan
SELECT public.create_default_recipe_books('8b30ab20-198f-49bf-b751-25b63cc9df95'); -- Erin
