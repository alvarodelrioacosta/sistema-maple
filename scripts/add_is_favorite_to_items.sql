-- Add is_favorite column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
