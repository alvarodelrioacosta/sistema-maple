-- =============================================
-- BOSSING SESSIONS - Weekly boss tracking
-- =============================================
-- One session per account per week (Monday-based).
-- Tracks which bosses were cleared and the RP earned.
-- RP expiry = last day of the month AFTER the bossing month
-- (e.g., bossing in April → expires May 31).

-- Weekly bossing sessions (one per account per week)
CREATE TABLE IF NOT EXISTS bossing_sessions (
    id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id    UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    week_start    DATE         NOT NULL,  -- Monday of the bossing week
    bosses_cleared UUID[]      DEFAULT '{}',
    rp_earned     INTEGER      NOT NULL DEFAULT 0,
    rp_expires_at DATE         NOT NULL,
    registered_at TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    UNIQUE(account_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_bs_account ON bossing_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_bs_week    ON bossing_sessions(week_start);

-- Per-account prequest completion (which bosses an account has unlocked)
-- A row here means the prequest is done for that account+boss.
CREATE TABLE IF NOT EXISTS account_boss_prequests (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    boss_id    UUID NOT NULL REFERENCES bosses(id)   ON DELETE CASCADE,
    PRIMARY KEY (account_id, boss_id)
);
