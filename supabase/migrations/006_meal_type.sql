-- Add meal_type to recipes so a recipe can be tagged for a specific meal slot.
-- NULL means "suitable for any slot" (backward-compatible default).
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS meal_type text DEFAULT NULL;

-- Optional: constrain to known values (can be relaxed later)
ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_meal_type_check;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_meal_type_check
  CHECK (meal_type IS NULL OR meal_type IN (
    'breakfast','lunch','dinner','beverage','appetizer','dessert'
  ));
