-- =============================================
-- Migration: Add show_in_daily to tasks
-- Description: Adds a flag to determine which tasks appear in the Daily Check Up module.
-- =============================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS show_in_daily BOOLEAN DEFAULT FALSE;

-- Optional: If you want some core tasks to show by default
-- UPDATE tasks SET show_in_daily = TRUE WHERE is_core = TRUE;
