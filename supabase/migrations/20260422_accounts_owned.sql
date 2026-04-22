-- Add owned column to accounts: false = sold/transferred to someone else
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owned boolean NOT NULL DEFAULT true;
