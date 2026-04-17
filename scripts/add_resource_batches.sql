-- =============================================
-- RESOURCE BATCHES - Expiration-aware inventory
-- =============================================
-- Replaces flat integer columns on accounts with a
-- batch-per-lot system supporting per-batch expiry dates.
-- FIFO consumption: earliest-expiring batches deducted first;
-- non-expiring batches (expires_at IS NULL) deducted last.

CREATE TABLE IF NOT EXISTS account_resource_batches (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id   UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    resource_type TEXT        NOT NULL,
    quantity     INTEGER      NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    expires_at   DATE         NULL,     -- NULL = never expires
    created_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_arb_account
    ON account_resource_batches(account_id);

CREATE INDEX IF NOT EXISTS idx_arb_account_resource
    ON account_resource_batches(account_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_arb_expires
    ON account_resource_batches(expires_at)
    WHERE expires_at IS NOT NULL;

-- =============================================
-- MIGRATE existing flat quantities as non-expiring batches
-- =============================================
INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'solid_cubes', solid_cubes, NULL
FROM accounts WHERE COALESCE(solid_cubes, 0) > 0;

INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'bright_cubes', bright_cubes, NULL
FROM accounts WHERE COALESCE(bright_cubes, 0) > 0;

INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'bonus_bright_cubes', bonus_bright_cubes, NULL
FROM accounts WHERE COALESCE(bonus_bright_cubes, 0) > 0;

INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'reward_points', reward_points, NULL
FROM accounts WHERE COALESCE(reward_points, 0) > 0;

INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'psok', psok, NULL
FROM accounts WHERE COALESCE(psok, 0) > 0;

INSERT INTO account_resource_batches (account_id, resource_type, quantity, expires_at)
SELECT id, 'guardian_scroll', guardian_scroll, NULL
FROM accounts WHERE COALESCE(guardian_scroll, 0) > 0;

-- NOTE: mesos_b and perfect_innoc are NOT batch-managed.
-- mesos_b stays as a plain column on accounts.
-- perfect_innoc stays in shared_inventory.
