-- =============================================
-- Create Resource Usage History Table
-- Tracks all resource usage during cubing sessions
-- =============================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.resource_usage_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.cube_sessions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    
    -- Resource details
    resource_type TEXT NOT NULL, -- bright_cubes, bonus_bright_cubes, psok, perfect_innoc, guardian_scroll, mesos
    action_type TEXT NOT NULL CHECK (action_type IN ('use', 'deduct', 'transfer')),
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Payment details
    payment_method TEXT CHECK (payment_method IN ('stock', 'mesos', 'rp', 'gift', NULL)),
    meso_cost NUMERIC(12, 2) DEFAULT 0,
    rp_cost INTEGER DEFAULT 0,
    
    -- Coverage
    covered_by_me BOOLEAN DEFAULT FALSE,
    
    -- Transfer details
    target_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resource_history_session ON public.resource_usage_history(session_id);
CREATE INDEX IF NOT EXISTS idx_resource_history_account ON public.resource_usage_history(account_id);
CREATE INDEX IF NOT EXISTS idx_resource_history_created ON public.resource_usage_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.resource_usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON public.resource_usage_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.resource_usage_history TO authenticated;
GRANT ALL ON public.resource_usage_history TO anon;

-- Verify
SELECT 'resource_usage_history table created successfully' AS status;
