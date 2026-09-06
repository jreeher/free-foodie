-- 020_data_integrity.sql
-- 1. Preserve meal plan entries when a recipe is deleted (copy title → custom_meal_name)
-- 2. Prevent duplicate pending invites to the same email

-- ============================================================
-- 1. BEFORE DELETE trigger on recipes
--    Sets custom_meal_name = recipe title on any entries that
--    only have recipe_id (no custom name), then nulls recipe_id.
--    This runs BEFORE the ON DELETE CASCADE, so entries survive.
-- ============================================================
CREATE OR REPLACE FUNCTION public.preserve_meal_plan_entries_on_recipe_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Copy title into entries that don't already have a custom name
  UPDATE public.meal_plan_entries
  SET custom_meal_name = OLD.title,
      recipe_id = NULL
  WHERE recipe_id = OLD.id
    AND (custom_meal_name IS NULL OR custom_meal_name = '');

  -- For entries that already have a custom name, just clear the recipe_id
  UPDATE public.meal_plan_entries
  SET recipe_id = NULL
  WHERE recipe_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_meal_plan_entries_on_recipe_delete ON public.recipes;
CREATE TRIGGER trg_preserve_meal_plan_entries_on_recipe_delete
  BEFORE DELETE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_meal_plan_entries_on_recipe_delete();

-- ============================================================
-- 2. Prevent duplicate pending invites (household + email unique
--    while status = 'pending')
-- ============================================================
DROP INDEX IF EXISTS public.household_invites_unique_pending;
CREATE UNIQUE INDEX household_invites_unique_pending
  ON public.household_invites (household_id, invited_email)
  WHERE status = 'pending';
