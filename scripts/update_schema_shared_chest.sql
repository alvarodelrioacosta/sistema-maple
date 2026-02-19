-- Add mesos_b column to accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS mesos_b BIGINT DEFAULT 0;

-- Create shared_inventory table
CREATE TABLE IF NOT EXISTS shared_inventory (
    id SERIAL PRIMARY KEY,
    mesos_stock BIGINT DEFAULT 0,
    perfect_innocence_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert singleton row if it doesn't exist
INSERT INTO shared_inventory (id, mesos_stock, perfect_innocence_stock)
SELECT 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM shared_inventory);

-- Add comment
COMMENT ON TABLE shared_inventory IS 'Singleton table for global shared resources like Mesos and Perfect Innocence';
