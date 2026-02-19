-- Migration: Add solid_cubes to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS solid_cubes INTEGER DEFAULT 0;

-- Update comment or metadata if needed
COMMENT ON COLUMN accounts.solid_cubes IS 'Quantity of Solid Cubes held by the account';
