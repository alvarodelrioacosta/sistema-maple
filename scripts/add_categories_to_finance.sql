-- Add category and subcategory columns to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Add category and subcategory columns to transactions_mesos
ALTER TABLE public.transactions_mesos
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Add category and subcategory columns to accounts_receivable
ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_mesos_category ON public.transactions_mesos(category);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_category ON public.accounts_receivable(category);
