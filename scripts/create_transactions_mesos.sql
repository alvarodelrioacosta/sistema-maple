-- Create transactions_mesos table
CREATE TABLE IF NOT EXISTS public.transactions_mesos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL NOT NULL,
    description TEXT,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    account_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.cube_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions_mesos ENABLE ROW LEVEL SECURITY;

-- Create Policies (assuming public access for now as per project pattern, or authenticated)
CREATE POLICY "Enable all for transactions_mesos" ON public.transactions_mesos
    FOR ALL USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_mesos_account_id ON public.transactions_mesos(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_mesos_created_at ON public.transactions_mesos(created_at);
