-- =============================================
-- UPDATE EVENTS MODULE - Adding Favorite and Finished fields
-- =============================================

-- Add new columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false;

-- Create a partial unique index to ensure only ONE favorite exists at a time
-- This index only enforces uniqueness when is_favorite is true.
DROP INDEX IF EXISTS idx_events_only_one_favorite;
CREATE UNIQUE INDEX idx_events_only_one_favorite ON events (is_favorite) WHERE (is_favorite = true);
