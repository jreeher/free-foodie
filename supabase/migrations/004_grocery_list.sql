-- ============================================================
-- GROCERY LISTS
-- ============================================================
CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grocery lists"
  ON grocery_lists FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Household members can view shared grocery lists"
  ON grocery_lists FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT household_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert grocery lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their grocery lists"
  ON grocery_lists FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their grocery lists"
  ON grocery_lists FOR DELETE
  USING (created_by = auth.uid());

-- One list per household/user per week
CREATE UNIQUE INDEX grocery_lists_household_week
  ON grocery_lists (COALESCE(household_id, created_by), week_start_date);

-- ============================================================
-- GROCERY LIST ITEMS
-- ============================================================
CREATE TABLE grocery_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grocery_list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  aisle_category TEXT NOT NULL DEFAULT 'Other',
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items for their grocery lists"
  ON grocery_list_items FOR ALL
  USING (
    grocery_list_id IN (
      SELECT id FROM grocery_lists WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Household members can manage shared grocery list items"
  ON grocery_list_items FOR ALL
  USING (
    grocery_list_id IN (
      SELECT gl.id FROM grocery_lists gl
      JOIN profiles p ON p.household_id = gl.household_id
      WHERE p.user_id = auth.uid()
        AND gl.household_id IS NOT NULL
    )
  );

CREATE INDEX grocery_list_items_list_id
  ON grocery_list_items (grocery_list_id, aisle_category, sort_order);

-- Enable Realtime for household sync
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_list_items;
