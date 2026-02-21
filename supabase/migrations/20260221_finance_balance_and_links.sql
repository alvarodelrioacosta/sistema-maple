-- Add balance column to financial_accounts if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_accounts' AND column_name = 'balance') THEN
        ALTER TABLE financial_accounts ADD COLUMN balance numeric DEFAULT 0;
    END IF;
END $$;

-- Add transfer_id column to transactions if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transfer_id') THEN
        ALTER TABLE transactions ADD COLUMN transfer_id uuid;
    END IF;
END $$;

-- Add index for transfer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id);

-- Optional: Initial balance calculation for existing accounts (to avoid starting at 0 if there are transactions)
-- This is a one-time sync. Caution: if history is long, this might be slow.
UPDATE financial_accounts fa
SET balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'transfer' AND t.description ILIKE '%transfer from%' THEN t.amount
            WHEN t.type = 'transfer' AND t.description ILIKE '%transfer to%' THEN -t.amount
            ELSE 0
        END
    ), 0)
    FROM transactions t
    WHERE t.financial_account_id = fa.id
);

-- Function for atomic balance increments
CREATE OR REPLACE FUNCTION increment_financial_balance(account_id uuid, amount_to_add numeric)
RETURNS void AS $$
BEGIN
  UPDATE financial_accounts
  SET balance = balance + amount_to_add
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;
