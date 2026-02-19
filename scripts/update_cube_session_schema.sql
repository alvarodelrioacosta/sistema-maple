-- Migration script to update cube_session table
-- Add new columns and remove old ones

ALTER TABLE cube_session
  ADD COLUMN psok_used int4 DEFAULT 0,
  ADD COLUMN bright_cubes_used int4 DEFAULT 0,
  ADD COLUMN bonus_bright_cubes_used int4 DEFAULT 0,
  ADD COLUMN perfect_innoc_used int4 DEFAULT 0,
  ADD COLUMN gaurdian_scroll_used int4 DEFAULT 0,
  ADD COLUMN psok_price int4 DEFAULT 0,
  ADD COLUMN bright_cubes_price int4 DEFAULT 0,
  ADD COLUMN bonus_bright_cubes_price int4 DEFAULT 0,
  ADD COLUMN perfect_innoc_price int4 DEFAULT 0,
  ADD COLUMN gaurdian_scroll_price int4 DEFAULT 0,
  ADD COLUMN cubing_session_total int4 DEFAULT 0,
  ADD COLUMN cubing_session_status text CHECK (cubing_session_status IN ('Ongoing', 'Finished')) DEFAULT 'Ongoing';

-- Drop old columns
ALTER TABLE cube_session
  DROP COLUMN cubes_used,
  DROP COLUMN cube_type;
