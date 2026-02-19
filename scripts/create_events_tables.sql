-- =============================================
-- EVENTS MODULE - Database Tables
-- Run this in Supabase SQL Editor
-- =============================================

-- Main events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily_login', 'bossing')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reset_hour INT DEFAULT 21, -- 9PM Buenos Aires
    week_start_day INT, -- 2=Tuesday (daily), 3=Wednesday (bossing)
    max_per_week INT, -- 5 for weekly daily login events
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Login: Rewards configuration
CREATE TABLE IF NOT EXISTS event_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    quantity INT NOT NULL,
    days_required INT NOT NULL
);

-- Daily Login: Progress per account per day
CREATE TABLE IF NOT EXISTS event_daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, account_id, date)
);

-- Daily Login: Claimed rewards
CREATE TABLE IF NOT EXISTS event_daily_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES event_daily_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, account_id, reward_id)
);

-- Bossing: Boss configuration
CREATE TABLE IF NOT EXISTS event_bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    boss_name TEXT NOT NULL,
    points INT NOT NULL
);

-- Bossing: Shop items configuration
CREATE TABLE IF NOT EXISTS event_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    price INT NOT NULL,
    max_per_week INT NOT NULL
);

-- Bossing: Weekly progress per account
CREATE TABLE IF NOT EXISTS event_bossing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    highest_boss_id UUID REFERENCES event_bosses(id),
    points_earned INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, account_id, week_number)
);

-- Bossing: Shop purchases
CREATE TABLE IF NOT EXISTS event_shop_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    shop_item_id UUID REFERENCES event_shop_items(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    purchased_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_daily_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bossing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_shop_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for public)
CREATE POLICY "Allow all for public" ON events FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_daily_rewards FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_daily_progress FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_daily_claims FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_bosses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_shop_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_bossing_progress FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for public" ON event_shop_purchases FOR ALL TO public USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_daily_progress_event ON event_daily_progress(event_id);
CREATE INDEX IF NOT EXISTS idx_event_daily_progress_account ON event_daily_progress(account_id);
CREATE INDEX IF NOT EXISTS idx_event_bossing_progress_event ON event_bossing_progress(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bossing_progress_account ON event_bossing_progress(account_id);
