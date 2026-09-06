-- Recipe import rate limiting log
CREATE TABLE recipe_import_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recipe_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import log"
  ON recipe_import_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own import log"
  ON recipe_import_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Index for fast rate limit queries
CREATE INDEX recipe_import_log_user_created
  ON recipe_import_log (user_id, created_at);

-- URL import cache (avoids duplicate API calls for same URL)
CREATE TABLE recipe_import_cache (
  url_hash TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache expires after 30 days (clean up via pg_cron or manually)
CREATE INDEX recipe_import_cache_created
  ON recipe_import_cache (created_at);
