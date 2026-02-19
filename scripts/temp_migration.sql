-- Create accounts_receivable table
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    session_id UUID REFERENCES cube_sessions(id), 
    item_id UUID REFERENCES items(id),
    description TEXT,
    amount NUMERIC DEFAULT 0,
    paid NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending', -- pending, partial, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add fk to transactions to link payments to AR
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS account_receivable_id UUID REFERENCES accounts_receivable(id);
