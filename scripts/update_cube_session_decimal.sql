-- Update cube_sessions price/total columns to support decimals

ALTER TABLE cube_sessions
ALTER COLUMN psok_price TYPE NUMERIC,
ALTER COLUMN bright_cubes_price TYPE NUMERIC,
ALTER COLUMN bonus_bright_cubes_price TYPE NUMERIC,
ALTER COLUMN perfect_innoc_price TYPE NUMERIC,
ALTER COLUMN gaurdian_scroll_price TYPE NUMERIC,
ALTER COLUMN cubing_session_total TYPE NUMERIC;
