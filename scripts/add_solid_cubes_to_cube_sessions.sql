-- Migration to add Solid Cubes usage and price to cube_sessions
ALTER TABLE cube_sessions 
ADD COLUMN IF NOT EXISTS solid_cubes_used int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS solid_cubes_price numeric DEFAULT 0;
