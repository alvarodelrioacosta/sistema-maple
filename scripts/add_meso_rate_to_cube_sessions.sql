-- Add meso_rate column to cube_sessions table
ALTER TABLE cube_sessions 
ADD COLUMN IF NOT EXISTS meso_rate numeric DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN cube_sessions.meso_rate IS 'Exchange rate for Mesos (b) to USD for this session';
