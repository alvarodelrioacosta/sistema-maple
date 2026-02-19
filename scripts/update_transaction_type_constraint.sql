-- Add 'transfer' to transaction type constraint
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop constraints related to transaction type
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.transactions'::regclass 
        AND contype = 'c'  -- Check constraints
        AND pg_get_constraintdef(oid) LIKE '%type%'
    LOOP
        EXECUTE 'ALTER TABLE public.transactions DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Add the new check constraint with updated values
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'sale', 'transfer'));
