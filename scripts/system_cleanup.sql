-- SYSTEM CLEANUP SCRIPT
-- Execute this in Supabase SQL Editor to remove test data and start fresh.
-- WARNING: This will permanently delete transactional data.

-- 1. Delete Sessions and History
TRUNCATE public.cube_sessions CASCADE;
TRUNCATE public.resource_usage_history CASCADE;
-- TRUNCATE public.potential_history CASCADE; -- Uncomment if you have this table

-- 2. Delete Transactions
TRUNCATE public.transactions_mesos CASCADE;
TRUNCATE public.transactions CASCADE;
TRUNCATE public.accounts_receivable CASCADE;

-- 3. Delete Items (Test items)
TRUNCATE public.items CASCADE;

-- 4. Reset Accounts Resources and Shared Inventory
UPDATE public.accounts 
SET 
  bright_cubes = 0, 
  bonus_bright_cubes = 0, 
  reward_points = 0, 
  psok = 0, 
  guardian_scroll = 0, 
  solid_cubes = 0, 
  mesos_b = 0;

UPDATE public.shared_inventory 
SET mesos_stock = 0;

-- 5. Optional: If you want to delete Clients, Accounts or Characters, uncomment below:
-- TRUNCATE public.clients CASCADE;
-- TRUNCATE public.characters CASCADE;
-- TRUNCATE public.accounts CASCADE;

-- 6. Optional: Reset Financial Account balances indirectly
-- Since balances are calculated dynamically from transactions, 
-- truncating the transactions table will automatically reset all account balances to 0.

-- CLEANUP COMPLETE
