-- Add currency column to cube_sessions table
ALTER TABLE cube_sessions 
ADD COLUMN currency TEXT DEFAULT 'Mesos (b)';

-- Comment on column
COMMENT ON COLUMN cube_sessions.currency IS 'Currency used for pricing in this session (e.g. Mesos (b), USD)';
