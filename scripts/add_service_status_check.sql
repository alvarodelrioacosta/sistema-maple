-- It seems the status column uses a Check Constraint instead of a custom Type.
-- This script drops the old constraint and adds a new one including 'Service'.

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;

ALTER TABLE items 
    ADD CONSTRAINT items_status_check 
    CHECK (status IN ('bulk', 'in_progress', 'in_stock', 'for_sale', 'sold', 'Service'));
