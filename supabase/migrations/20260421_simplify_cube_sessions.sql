-- Simplify cube_sessions: remove price/total/currency fields.
-- Pricing and totals move to the AR creation step in Cubing History.

ALTER TABLE cube_sessions
    DROP COLUMN IF EXISTS psok_price,
    DROP COLUMN IF EXISTS bright_cubes_price,
    DROP COLUMN IF EXISTS bonus_bright_cubes_price,
    DROP COLUMN IF EXISTS perfect_innoc_price,
    DROP COLUMN IF EXISTS gaurdian_scroll_price,
    DROP COLUMN IF EXISTS solid_cubes_price,
    DROP COLUMN IF EXISTS cubing_session_total,
    DROP COLUMN IF EXISTS currency,
    DROP COLUMN IF EXISTS meso_rate;
