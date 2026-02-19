-- FIX FOR TRANSACTIONS_MESOS TABLE
-- Execute this in Supabase SQL Editor if Buy Mesos transactions are not being recorded.

-- 1. Ensure account_id can be NULL (required for Shared Vault)
ALTER TABLE public.transactions_mesos ALTER COLUMN account_id DROP NOT NULL;

-- 2. Ensure type allows 'income', 'expense', and 'transfer'
ALTER TABLE public.transactions_mesos DROP CONSTRAINT IF EXISTS transactions_mesos_type_check;
ALTER TABLE public.transactions_mesos ADD CONSTRAINT transactions_mesos_type_check CHECK (type IN ('income', 'expense', 'transfer'));

-- 3. Ensure category and subcategory columns exist
ALTER TABLE public.transactions_mesos ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.transactions_mesos ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- 4. Ensure index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_mesos_category ON public.transactions_mesos(category);

-- 5. IMPORTANT: If you see an error about 'id' column or RLS, ensure policy exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions_mesos' AND policyname = 'Enable all for transactions_mesos'
    ) THEN
        PERFORM 'CREATE POLICY "Enable all for transactions_mesos" ON public.transactions_mesos FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;
