-- Update mesos columns to support decimals

-- 1. Update accounts table
ALTER TABLE accounts
ALTER COLUMN mesos_b TYPE NUMERIC;

-- 2. Update shared_inventory table
ALTER TABLE shared_inventory
ALTER COLUMN mesos_stock TYPE NUMERIC;
