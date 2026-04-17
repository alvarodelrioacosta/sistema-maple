-- =============================================
-- ADD account_receivable_id TO cube_sessions
-- =============================================
-- Links a finished cubing session to its generated
-- Account Receivable, so CubingHistory can show
-- whether the session has been invoiced or not.

ALTER TABLE cube_sessions
ADD COLUMN IF NOT EXISTS account_receivable_id UUID REFERENCES accounts_receivable(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cube_sessions_ar_id ON cube_sessions(account_receivable_id);
