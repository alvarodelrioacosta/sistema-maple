-- Drop legacy accounts_receivable system
-- account_receivable_id column on cube_sessions and the accounts_receivable table
-- are no longer used; AR v2 (client_ledger_entries) is the sole AR source.

ALTER TABLE cube_sessions DROP COLUMN IF EXISTS account_receivable_id;

DROP TABLE IF EXISTS accounts_receivable CASCADE;
