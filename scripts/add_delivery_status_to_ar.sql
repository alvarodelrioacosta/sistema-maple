-- Add delivery tracking columns to accounts_receivable
ALTER TABLE accounts_receivable 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Update existing records to false (already default, but safe)
UPDATE accounts_receivable SET is_delivered = FALSE WHERE is_delivered IS NULL;
