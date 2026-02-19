-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS main_potential;
DROP TABLE IF EXISTS bonus_potential;

-- =============================================
-- MAIN POTENTIAL TABLE
-- =============================================
CREATE TABLE main_potential (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL,       -- e.g., 'Hat', 'Bottom'
    rank TEXT NOT NULL,            -- 'Epic', 'Unique', 'Legendary' (No Rare)
    potential_name TEXT NOT NULL,  -- e.g., 'STR %', 'Auto Steal'
    
    -- Level Scaling Values
    val_0_30 TEXT DEFAULT NULL,
    val_31_70 TEXT DEFAULT NULL,
    val_71 TEXT DEFAULT NULL,
    val_151 TEXT DEFAULT NULL,     -- Matches '(GMS) 151+'
    val_120 TEXT DEFAULT NULL,     -- Special case like Auto Steal

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Main Potential
CREATE INDEX idx_main_potential_lookup 
ON main_potential(item_type, rank);

-- =============================================
-- BONUS POTENTIAL TABLE
-- =============================================
CREATE TABLE bonus_potential (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL,
    rank TEXT NOT NULL,
    potential_name TEXT NOT NULL,

    -- Level Scaling Values
    val_0_30 TEXT DEFAULT NULL,
    val_31_70 TEXT DEFAULT NULL,
    val_71 TEXT DEFAULT NULL,
    val_151 TEXT DEFAULT NULL,
    val_120 TEXT DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Bonus Potential
CREATE INDEX idx_bonus_potential_lookup 
ON bonus_potential(item_type, rank);

COMMENT ON TABLE main_potential IS 'Main Potentials (Epic+, Prime Only) with flattened level values.';
