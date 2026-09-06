-- ============================================================
-- COOK TRACKING
-- Track when a recipe was last cooked for "cook again" suggestions
-- ============================================================
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS last_cooked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS recipes_last_cooked_at
  ON recipes (user_id, last_cooked_at NULLS LAST);
