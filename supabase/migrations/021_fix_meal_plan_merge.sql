-- Fix merge_user_data_into_household to handle meal plan week conflicts gracefully.
-- When a user joins a household and both parties have plans for the same week,
-- the old UPDATE SET household_id would hit the unique constraint
-- (COALESCE(household_id, created_by), week_start_date).
--
-- New strategy for meal plans:
--   1. For weeks where the target household already has a plan, move the joining
--      user's entries into the existing household plan, then delete their old plan.
--   2. For all other weeks, just update household_id as before.

CREATE OR REPLACE FUNCTION public.merge_user_data_into_household(
  p_user_id   UUID,
  p_household_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- ── Recipes ──────────────────────────────────────────────────────────────────
  UPDATE public.recipes
    SET household_id = p_household_id
  WHERE user_id = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- ── Recipe books ─────────────────────────────────────────────────────────────
  UPDATE public.recipe_books
    SET household_id = p_household_id
  WHERE user_id = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- ── Week rules ────────────────────────────────────────────────────────────────
  UPDATE public.week_rules
    SET household_id = p_household_id
  WHERE user_id = p_user_id AND household_id IS NULL;

  -- ── Grocery prefs ─────────────────────────────────────────────────────────────
  -- Drop duplicates where the household already has a pref for this ingredient
  DELETE FROM public.household_grocery_prefs solo
  WHERE solo.user_id = p_user_id
    AND solo.household_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.household_grocery_prefs existing
      WHERE existing.household_id = p_household_id
        AND lower(existing.ingredient_name) = lower(solo.ingredient_name)
    );
  UPDATE public.household_grocery_prefs
    SET household_id = p_household_id
  WHERE user_id = p_user_id AND household_id IS NULL;

  -- ── Meal plans ────────────────────────────────────────────────────────────────
  -- For weeks where the target household already has a plan, re-parent the joining
  -- user's entries into the existing plan, then delete their now-empty old plan.
  FOR r IN
    SELECT
      mp_user.id          AS user_plan_id,
      mp_hh.id            AS hh_plan_id
    FROM public.meal_plans mp_user
    JOIN public.meal_plans mp_hh
      ON  mp_hh.household_id  = p_household_id
      AND mp_hh.week_start_date = mp_user.week_start_date
    WHERE mp_user.created_by = p_user_id
      AND (mp_user.household_id IS NULL OR mp_user.household_id <> p_household_id)
  LOOP
    -- Move entries into the household's plan
    UPDATE public.meal_plan_entries
      SET meal_plan_id = r.hh_plan_id
    WHERE meal_plan_id = r.user_plan_id;

    -- Delete the now-empty user plan
    DELETE FROM public.meal_plans WHERE id = r.user_plan_id;
  END LOOP;

  -- For all remaining weeks (no conflict), just update the household_id
  UPDATE public.meal_plans
    SET household_id = p_household_id
  WHERE created_by = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);

  -- ── Grocery lists ─────────────────────────────────────────────────────────────
  UPDATE public.grocery_lists
    SET household_id = p_household_id
  WHERE created_by = p_user_id
    AND (household_id IS NULL OR household_id <> p_household_id);
END;
$$;
