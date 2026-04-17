-- =============================================
-- DROP LEGACY RESOURCE COLUMNS FROM ACCOUNTS
-- =============================================

-- We are fully transitioning to account_resource_batches
-- Since we are starting from 0, we simply drop the legacy fields.

ALTER TABLE accounts
DROP COLUMN IF EXISTS bright_cubes,
DROP COLUMN IF EXISTS bonus_bright_cubes,
DROP COLUMN IF EXISTS reward_points,
DROP COLUMN IF EXISTS psok,
DROP COLUMN IF EXISTS guardian_scroll,
DROP COLUMN IF EXISTS solid_cubes;
