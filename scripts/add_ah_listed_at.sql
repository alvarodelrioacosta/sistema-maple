-- Add ah_listed_at column to items table for Auction House tracking
-- This timestamp tracks when an item was listed on the AH
-- Items expire after 48 hours and need to be relisted

ALTER TABLE items ADD COLUMN ah_listed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN items.ah_listed_at IS 'Timestamp when item was listed on Auction House. Expires after 48 hours.';
