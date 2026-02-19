-- =============================================
-- Update Tradeability Check Constraint
-- This script modifies the constraint on items.tradeability
-- to allow 'Tradeable Once' instead of 'PSOKED'
-- =============================================

-- Step 1: Drop the existing check constraint (if it exists)
-- The constraint name may vary. Common patterns: items_tradeability_check, check_tradeability, etc.
-- You may need to look up the exact constraint name in your database.

-- Option A: If you know the constraint name
-- ALTER TABLE public.items DROP CONSTRAINT items_tradeability_check;

-- Option B: Drop all check constraints on tradeability column (safer for unknown name)
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop constraints related to tradeability
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.items'::regclass 
        AND contype = 'c'  -- Check constraints
        AND pg_get_constraintdef(oid) LIKE '%tradeability%'
    LOOP
        EXECUTE 'ALTER TABLE public.items DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Add the new check constraint with updated values
ALTER TABLE public.items 
ADD CONSTRAINT items_tradeability_check 
CHECK (tradeability IN ('Tradeable', 'Tradeable Once', 'Untradeable'));

-- Step 3: Migrate existing PSOKED values to Tradeable Once
UPDATE public.items 
SET tradeability = 'Tradeable Once' 
WHERE tradeability = 'PSOKED';

-- Verification
SELECT DISTINCT tradeability, COUNT(*) 
FROM public.items 
GROUP BY tradeability;
