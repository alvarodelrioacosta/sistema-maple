-- owned is now fully replaced by status; drop it (expand/contract contract phase).
-- Apply this ONLY after 20260721_accounts_status.sql has been applied and the app
-- code no longer references `owned` (verified: no `.owned` reads remain in src/).
ALTER TABLE accounts DROP COLUMN owned;
