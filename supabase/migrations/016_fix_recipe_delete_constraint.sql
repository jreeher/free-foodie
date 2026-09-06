-- Fix: deleting a recipe that appears in meal_plan_entries violated the
-- entry_has_content check constraint (recipe_id IS NOT NULL OR custom_meal_name IS NOT NULL)
-- because ON DELETE SET NULL would null out recipe_id while custom_meal_name is also null.
-- Switch to ON DELETE CASCADE so the entry is removed along with the recipe.

ALTER TABLE public.meal_plan_entries
  DROP CONSTRAINT IF EXISTS meal_plan_entries_recipe_id_fkey;

ALTER TABLE public.meal_plan_entries
  ADD CONSTRAINT meal_plan_entries_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;
