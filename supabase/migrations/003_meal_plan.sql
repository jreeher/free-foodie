-- ============================================================
-- MEAL PLANS
-- ============================================================
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Always a Monday
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans"
  ON meal_plans FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Household members can view shared meal plans"
  ON meal_plans FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their meal plans"
  ON meal_plans FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their meal plans"
  ON meal_plans FOR DELETE
  USING (created_by = auth.uid());

-- Unique plan per household per week
CREATE UNIQUE INDEX meal_plans_household_week
  ON meal_plans (COALESCE(household_id, created_by), week_start_date);

-- ============================================================
-- MEAL PLAN ENTRIES
-- ============================================================
CREATE TABLE meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner')),
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  custom_meal_name TEXT,
  servings_override INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT entry_has_content CHECK (recipe_id IS NOT NULL OR custom_meal_name IS NOT NULL)
);

ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage entries for their meal plans"
  ON meal_plan_entries FOR ALL
  USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Household members can view shared meal plan entries"
  ON meal_plan_entries FOR SELECT
  USING (
    meal_plan_id IN (
      SELECT mp.id FROM meal_plans mp
      JOIN profiles p ON p.household_id = mp.household_id
      WHERE p.user_id = auth.uid()
        AND mp.household_id IS NOT NULL
    )
  );

CREATE INDEX meal_plan_entries_plan_date
  ON meal_plan_entries (meal_plan_id, date, meal_slot);
