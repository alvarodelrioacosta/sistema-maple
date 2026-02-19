-- =============================================
-- UPDATE TASKS - Adding order_index for dynamic sorting
-- =============================================

-- Add column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Initialize order_index for existing active tasks
WITH active_ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
    FROM tasks
    WHERE is_completed = false
)
UPDATE tasks
SET order_index = active_ordered.row_num
FROM active_ordered
WHERE tasks.id = active_ordered.id;
