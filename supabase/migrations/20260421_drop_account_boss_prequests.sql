-- Boss prequest tracking migrated to characters.unlock_* boolean columns.
-- The account_boss_prequests junction table is no longer used.
DROP TABLE IF EXISTS account_boss_prequests;
