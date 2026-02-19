-- Migration script to update clients table
-- Add pricing and coverage columns

ALTER TABLE clients
  ADD COLUMN bright_cube_price decimal DEFAULT 0,
  ADD COLUMN bonus_bright_cube_price decimal DEFAULT 0,
  ADD COLUMN covers_psok boolean DEFAULT false,
  ADD COLUMN covers_guardian_scroll boolean DEFAULT false,
  ADD COLUMN covers_perfect_innoc boolean DEFAULT false,
  ADD COLUMN currency text DEFAULT 'USD';
