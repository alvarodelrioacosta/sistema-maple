-- Add session_id to transactions table to link back to usage details
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES cube_sessions(id);

-- Create table for partial payments
CREATE TABLE IF NOT EXISTS transaction_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL, -- Amount paid in the original transaction currency (debt reduction)
    payment_currency VARCHAR(50) NOT NULL, -- Currency used for payment (USD, Mesos, Item, etc.)
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'TRANSFER', 'ITEM', 'OTHER'
    exchange_rate NUMERIC DEFAULT 1, -- Conversion rate used if currencies differ
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_payments_transaction_id ON transaction_payments(transaction_id);

-- Enable RLS (if applicable, assuming public access for now based on previous patterns but good practice)
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON transaction_payments
    FOR ALL USING (auth.role() = 'authenticated');
