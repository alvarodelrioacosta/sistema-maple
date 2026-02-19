-- Add delivered column to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Migrate existing 'delivered' status items
UPDATE items 
SET status = 'Service', delivered = TRUE 
WHERE status = 'delivered';

-- Clean up status constraint
DO $$ 
BEGIN 
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
    
    ALTER TABLE items ADD CONSTRAINT items_status_check 
    CHECK (status IN ('bulk', 'in_progress', 'in_stock', 'for_sale', 'sold', 'Service'));
END $$;
