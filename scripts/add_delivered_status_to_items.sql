-- Add 'delivered' to the allowed statuses for items
-- First, we need to find the constraint name if it exists, or just try to replace it.
-- Usually, it's a CHECK constraint.

DO $$ 
BEGIN 
    -- Check if the constraint exists and drop it to recreate with the new value
    -- Note: This assumes the constraint name, if it fails, we might need to check the actual name in DB
    ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
    
    ALTER TABLE items ADD CONSTRAINT items_status_check 
    CHECK (status IN ('bulk', 'in_progress', 'in_stock', 'for_sale', 'sold', 'Service', 'delivered'));
END $$;
