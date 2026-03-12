-- Migration: Add max_per_event to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_per_event INTEGER DEFAULT NULL;

COMMENT ON COLUMN events.max_per_event IS 'Maximum number of daily check-ins allowed for the entire duration of the event.';
