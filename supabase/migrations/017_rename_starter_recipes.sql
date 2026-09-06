-- Rename "Starter Recipes" → "Simmer Down Favorites" for all existing users
UPDATE public.recipe_books
SET name = 'Simmer Down Favorites',
    description = 'Handpicked recipes from the Simmer Down team'
WHERE name = 'Starter Recipes';

-- Update create_default_recipe_books so new users get the updated name
CREATE OR REPLACE FUNCTION public.create_default_recipe_books(
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_book_id uuid;
  book_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_books WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Use first name if available, fall back to "My Recipes"
  book_name := CASE
    WHEN p_display_name IS NOT NULL AND trim(p_display_name) != ''
    THEN split_part(trim(p_display_name), ' ', 1) || '''s Recipes'
    ELSE 'My Recipes'
  END;

  -- Simmer Down Favorites (contains the built-in default recipes)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, 'Simmer Down Favorites', 'Handpicked recipes from the Simmer Down team', 0, true)
  RETURNING id INTO starter_book_id;

  INSERT INTO public.recipe_book_items (recipe_book_id, recipe_id)
  SELECT starter_book_id, id FROM public.recipes WHERE is_default = true;

  -- Personalized recipe book (blank to start)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, book_name, 'Your personal recipe collection', 1, true);
END;
$$;
