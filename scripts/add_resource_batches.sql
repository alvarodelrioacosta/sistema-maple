-- =============================================
-- EXPIRED-BASED RESOURCES MIGRATION
-- =============================================

-- 1. Create the new table for expiration-based resource batches
CREATE TABLE IF NOT EXISTS resource_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    resource_type VARCHAR(255) NOT NULL, -- e.g. 'solid_cubes', 'reward_points', 'papulatus_mark'
    quantity INTEGER NOT NULL DEFAULT 0,
    expiration_date TIMESTAMPTZ,         -- NULL means it never expires
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries by account and finding unexpired resources
CREATE INDEX IF NOT EXISTS idx_rb_account ON resource_batches(account_id);
CREATE INDEX IF NOT EXISTS idx_rb_expiration ON resource_batches(expiration_date);

-- 2. Drop the old direct columns from accounts (we are starting from 0)
ALTER TABLE accounts
DROP COLUMN IF EXISTS bright_cubes,
DROP COLUMN IF EXISTS bonus_bright_cubes,
DROP COLUMN IF EXISTS reward_points,
DROP COLUMN IF EXISTS psok,
DROP COLUMN IF EXISTS guardian_scroll,
DROP COLUMN IF EXISTS solid_cubes;
