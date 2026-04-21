-- Remove cube pricing, coverage, and currency fields from clients table.
-- These are now entered manually when creating an Account Receivable.

ALTER TABLE clients
    DROP COLUMN IF EXISTS bright_cube_price,
    DROP COLUMN IF EXISTS bonus_bright_cube_price,
    DROP COLUMN IF EXISTS solid_cubes_price,
    DROP COLUMN IF EXISTS covers_psok,
    DROP COLUMN IF EXISTS covers_guardian_scroll,
    DROP COLUMN IF EXISTS covers_perfect_innoc,
    DROP COLUMN IF EXISTS currency;
