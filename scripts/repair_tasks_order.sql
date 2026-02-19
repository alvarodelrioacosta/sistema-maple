-- =============================================
-- REPAIR TASKS ORDER - Reset to strict 1-based sequence
-- Run this in Supabase SQL Editor if numbers are duplicated or starting at 0
-- =============================================

-- 1. Reset all order_index to null first to avoid conflicts if needed
UPDATE tasks SET order_index = NULL;

-- 2. Re-assign order_index only to active tasks, starting from 1
WITH reordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
    FROM tasks
    WHERE is_completed = false
)
UPDATE tasks
SET order_index = reordered.new_order
FROM reordered
WHERE tasks.id = reordered.id;
