-- Update create_default_recipe_books to personalize the "My Recipes" book name
-- using the user's first name (e.g. "Jordan's Recipes").
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

  -- Starter Recipes (contains the built-in default recipes)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, 'Starter Recipes', 'Curated recipes to get you cooking', 0, true)
  RETURNING id INTO starter_book_id;

  INSERT INTO public.recipe_book_items (recipe_book_id, recipe_id)
  SELECT starter_book_id, id FROM public.recipes WHERE is_default = true;

  -- Personalized recipe book (blank to start)
  INSERT INTO public.recipe_books (user_id, name, description, sort_order, is_default)
  VALUES (p_user_id, book_name, 'Your personal recipe collection', 1, true);
END;
$$;

-- Update the trigger to pass display_name from the new profile row
CREATE OR REPLACE FUNCTION public.handle_new_profile_books()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_default_recipe_books(NEW.user_id, NEW.display_name);
  RETURN NEW;
END;
$$;

-- Rename existing "My Recipes" books for current users based on their display_name
UPDATE public.recipe_books rb
SET name = split_part(trim(p.display_name), ' ', 1) || '''s Recipes'
FROM public.profiles p
WHERE rb.user_id = p.user_id
  AND rb.name = 'My Recipes'
  AND rb.is_default = true
  AND p.display_name IS NOT NULL
  AND trim(p.display_name) != '';
