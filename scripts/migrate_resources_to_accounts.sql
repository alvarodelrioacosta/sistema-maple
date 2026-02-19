/*
 * Migration Script: Move Resources to Accounts Table
 * 
 * 1. Add resource columns to accounts table.
 * 2. Migrate data from resource_inventory to accounts.
 * 3. Drop resource_inventory table.
 */

-- 1. Add columns to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS bright_cubes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_bright_cubes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guardian_scroll INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS psok INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- 2. Migrate data
-- We need to aggregate data if there are multiple entries (though unique constraint usually prevents this),
-- or just update based on the resource_type.

-- Update bright_cubes
UPDATE public.accounts a
SET bright_cubes = (
    SELECT quantity 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'bright_cubes'
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'bright_cubes'
);

-- Update bonus_bright_cubes
UPDATE public.accounts a
SET bonus_bright_cubes = (
    SELECT quantity 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'bonus_bright_cubes'
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'bonus_bright_cubes'
);

-- Update guardian_scroll
UPDATE public.accounts a
SET guardian_scroll = (
    SELECT quantity 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'guardian_scroll'
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'guardian_scroll'
);

-- Update psok
UPDATE public.accounts a
SET psok = (
    SELECT quantity 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'psok'
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'psok'
);

-- Update reward_points
UPDATE public.accounts a
SET reward_points = (
    SELECT quantity 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'reward_points'
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 
    FROM public.resource_inventory r 
    WHERE r.account_id = a.id AND r.resource_type = 'reward_points'
);

-- 3. Drop resource_inventory table
-- WARNING: Verify migration before running this line in production if critical data.
-- Since this is a dev script requested by user, we proceed.
DROP TABLE IF EXISTS public.resource_inventory;
