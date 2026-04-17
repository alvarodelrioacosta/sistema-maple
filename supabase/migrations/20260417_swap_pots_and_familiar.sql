-- Swap order of Boss Pots and Boss Familiar
-- We assume Boss Pots has index X and Boss Familiar has index Y
-- We use a temporary value to avoid constraint violations if any

BEGIN;

-- Get current indexes (adjusting based on known names)
-- 'Extra Stats Pt.2 — Boss Pots'
-- 'Extra Stats Pt.3 — Boss Familiar'

UPDATE content_unlocks 
SET order_index = -1 
WHERE name = 'Extra Stats Pt.2 — Boss Pots';

UPDATE content_unlocks 
SET order_index = (SELECT order_index FROM content_unlocks WHERE name = 'Extra Stats Pt.3 — Boss Familiar')
WHERE name = 'Extra Stats Pt.2 — Boss Pots';

UPDATE content_unlocks 
SET order_index = (SELECT MAX(order_index) + 1 FROM content_unlocks)
WHERE name = 'Extra Stats Pt.3 — Boss Familiar';

-- Actually, a simpler way if we know the order:
-- Pots was 2, Familiar was 3. Swap them.
-- But since they are strings, let's just target them directly.

COMMIT;
