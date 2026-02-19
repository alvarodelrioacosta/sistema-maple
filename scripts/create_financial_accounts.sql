-- Create financial_accounts table
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL,
    type TEXT DEFAULT 'Wallet',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Accounts
INSERT INTO financial_accounts (name, currency, type)
VALUES 
    ('BCP', 'Soles', 'Bank'),
    ('PayPal', 'USD', 'Wallet'),
    ('PPFF', 'USD', 'Wallet'),
    ('Mercado Pago', 'Pesos Arg', 'Wallet'),
    ('Efectivo', 'Pesos Arg', 'Cash'),
    ('Efectivo Dolares', 'USD', 'Cash'),
    ('Binance', 'USD', 'Wallet'),
    ('Inventario / Mesos', 'Mesos (b)', 'Game')
ON CONFLICT (name) DO NOTHING;

-- Add financial_account_id to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS financial_account_id UUID REFERENCES financial_accounts(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_financial_account ON transactions(financial_account_id);
