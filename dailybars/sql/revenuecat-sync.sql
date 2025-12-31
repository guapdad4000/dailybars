-- ============================================================================
-- DAILY BARS – REVENUECAT + PREMIUM TELEMETRY
-- Run this in Supabase SQL Editor to persist RevenueCat customer snapshots and
-- premium usage counters so support can audit entitlement state.
-- ============================================================================

-- Table: revenuecat_customers
CREATE TABLE IF NOT EXISTS revenuecat_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_key TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,
    app_user_id TEXT,
    entitlement_pro_active BOOLEAN DEFAULT FALSE,
    entitlements JSONB DEFAULT '{}'::JSONB,
    customer_info JSONB,
    environment TEXT,
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenuecat_user_key ON revenuecat_customers(user_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenuecat_app_user ON revenuecat_customers(app_user_id);

-- Table: premium_usage
CREATE TABLE IF NOT EXISTS premium_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_key TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,
    ai_uses INTEGER DEFAULT 0,
    last_ai_use TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_usage_user_key ON premium_usage(user_key);

-- Enable RLS and keep policies open (match existing anon access; tighten later)
ALTER TABLE revenuecat_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RevenueCat snapshots are viewable by everyone" ON revenuecat_customers FOR SELECT USING (true);
CREATE POLICY "RevenueCat snapshots can be inserted by anyone" ON revenuecat_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "RevenueCat snapshots can be updated by anyone" ON revenuecat_customers FOR UPDATE USING (true);

CREATE POLICY "Premium usage is viewable by everyone" ON premium_usage FOR SELECT USING (true);
CREATE POLICY "Premium usage can be inserted by anyone" ON premium_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Premium usage can be updated by anyone" ON premium_usage FOR UPDATE USING (true);

-- Updated-at triggers
DROP TRIGGER IF EXISTS set_revenuecat_updated_at ON revenuecat_customers;
CREATE TRIGGER set_revenuecat_updated_at
    BEFORE UPDATE ON revenuecat_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_premium_usage_updated_at ON premium_usage;
CREATE TRIGGER set_premium_usage_updated_at
    BEFORE UPDATE ON premium_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
