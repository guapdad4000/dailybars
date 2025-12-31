-- ============================================================================
-- DAILY BARS - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 2. BARS TABLE (The main content - your lyrics/ideas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    audio_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    ai_generated BOOLEAN DEFAULT FALSE,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bars_username ON bars(username);
CREATE INDEX IF NOT EXISTS idx_bars_created_at ON bars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bars_is_favorite ON bars(is_favorite);

-- ============================================================================
-- 3. SONGS TABLE (Track editor - full songs with blocks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS songs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    blocks JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    is_favorite BOOLEAN DEFAULT FALSE,
    cover_image TEXT,
    beat_url TEXT,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_songs_username ON songs(username);
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);

-- ============================================================================
-- 4. DAILY DEPOSIT PROMPT TABLES (The Syndicate Vault)
-- ============================================================================

-- Feelings (emotions to write about)
CREATE TABLE IF NOT EXISTS prompts_feelings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (locations/scenarios)
CREATE TABLE IF NOT EXISTS prompts_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objects (items to include)
CREATE TABLE IF NOT EXISTS prompts_objects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smells (sensory details)
CREATE TABLE IF NOT EXISTS prompts_smells (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocab (required words)
CREATE TABLE IF NOT EXISTS prompts_vocab (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. COMMUNITY SUBMISSIONS (The Syndicate feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    author TEXT DEFAULT 'Anonymous',
    likes INTEGER DEFAULT 0,
    submission_type TEXT DEFAULT 'PROMPT', -- 'PROMPT' or 'VERSE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_created_at ON community_submissions(created_at DESC);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - IMPORTANT!
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_smells ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_vocab ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES - Allow public read/write for now (no auth required)
-- You can tighten this up later with Supabase Auth
-- ============================================================================

-- USERS: Anyone can read, anyone can insert (for registration)
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can be created by anyone" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own record" ON users FOR UPDATE USING (true);

-- BARS: Full access (we filter by username in the app)
CREATE POLICY "Bars are viewable by everyone" ON bars FOR SELECT USING (true);
CREATE POLICY "Bars can be created by anyone" ON bars FOR INSERT WITH CHECK (true);
CREATE POLICY "Bars can be updated by anyone" ON bars FOR UPDATE USING (true);
CREATE POLICY "Bars can be deleted by anyone" ON bars FOR DELETE USING (true);

-- SONGS: Full access (we filter by username in the app)
CREATE POLICY "Songs are viewable by everyone" ON songs FOR SELECT USING (true);
CREATE POLICY "Songs can be created by anyone" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Songs can be updated by anyone" ON songs FOR UPDATE USING (true);
CREATE POLICY "Songs can be deleted by anyone" ON songs FOR DELETE USING (true);

-- PROMPTS: Read-only for most users, insert for contributors
CREATE POLICY "Prompts feelings readable" ON prompts_feelings FOR SELECT USING (true);
CREATE POLICY "Prompts feelings insertable" ON prompts_feelings FOR INSERT WITH CHECK (true);

CREATE POLICY "Prompts settings readable" ON prompts_settings FOR SELECT USING (true);
CREATE POLICY "Prompts settings insertable" ON prompts_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Prompts objects readable" ON prompts_objects FOR SELECT USING (true);
CREATE POLICY "Prompts objects insertable" ON prompts_objects FOR INSERT WITH CHECK (true);

CREATE POLICY "Prompts smells readable" ON prompts_smells FOR SELECT USING (true);
CREATE POLICY "Prompts smells insertable" ON prompts_smells FOR INSERT WITH CHECK (true);

CREATE POLICY "Prompts vocab readable" ON prompts_vocab FOR SELECT USING (true);
CREATE POLICY "Prompts vocab insertable" ON prompts_vocab FOR INSERT WITH CHECK (true);

-- COMMUNITY: Full public access
CREATE POLICY "Community readable" ON community_submissions FOR SELECT USING (true);
CREATE POLICY "Community insertable" ON community_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Community updatable" ON community_submissions FOR UPDATE USING (true);

-- ============================================================================
-- 8. AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to bars and songs
CREATE TRIGGER bars_updated_at
    BEFORE UPDATE ON bars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 9. PREMIUM + REVENUECAT TELEMETRY (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

-- Table to persist RevenueCat customer snapshots for troubleshooting / support
CREATE TABLE IF NOT EXISTS revenuecat_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_key TEXT NOT NULL, -- fallback identifier (user id > username > guest)
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

-- Table to persist premium usage counters (e.g., AI runs) for analytics/support
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

-- Enable RLS
ALTER TABLE revenuecat_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_usage ENABLE ROW LEVEL SECURITY;

-- Open policies (align with existing anon access; tighten later as needed)
CREATE POLICY "RevenueCat snapshots are viewable by everyone" ON revenuecat_customers FOR SELECT USING (true);
CREATE POLICY "RevenueCat snapshots can be inserted by anyone" ON revenuecat_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "RevenueCat snapshots can be updated by anyone" ON revenuecat_customers FOR UPDATE USING (true);

CREATE POLICY "Premium usage is viewable by everyone" ON premium_usage FOR SELECT USING (true);
CREATE POLICY "Premium usage can be inserted by anyone" ON premium_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Premium usage can be updated by anyone" ON premium_usage FOR UPDATE USING (true);

-- Bump timestamps automatically on updates
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

-- ============================================================================
-- 10. SEED DATA - Daily Deposit Vault Starters
-- ============================================================================

-- Feelings
INSERT INTO prompts_feelings (value) VALUES
    ('Confidence'), ('Hunger'), ('Betrayal'), ('Loyalty'), ('Paranoia'),
    ('Ambition'), ('Grief'), ('Revenge'), ('Love'), ('Regret'),
    ('Pride'), ('Jealousy'), ('Freedom'), ('Loneliness'), ('Triumph');

-- Settings
INSERT INTO prompts_settings (value) VALUES
    ('Oakland'), ('The trap house'), ('A private jet'), ('Your grandmother''s kitchen'),
    ('A funeral'), ('The studio at 3AM'), ('A sold-out arena'), ('County jail'),
    ('The barbershop'), ('A casino floor'), ('The corner store'), ('A rooftop downtown');

-- Objects
INSERT INTO prompts_objects (value) VALUES
    ('A gold chain'), ('Your mother''s Bible'), ('A loaded pistol'), ('A cracked iPhone'),
    ('A stack of hundreds'), ('An eviction notice'), ('A voicemail you never deleted'),
    ('A burner phone'), ('A diamond ring'), ('Your first platinum plaque');

-- Smells
INSERT INTO prompts_smells (value) VALUES
    ('Burnt rubber'), ('Your ex''s perfume'), ('Fresh hundreds'), ('Gun smoke'),
    ('Mama''s cooking'), ('New car leather'), ('Rain on hot concrete'),
    ('Champagne'), ('Studio session vibes'), ('Prison laundry');

-- Vocab
INSERT INTO prompts_vocab (value) VALUES
    ('Algorithm'), ('Currency'), ('Elevated'), ('Blueprint'), ('Frequency'),
    ('Residue'), ('Caliber'), ('Testament'), ('Velocity'), ('Perimeter'),
    ('Leverage'), ('Threshold'), ('Apparatus'), ('Parallel'), ('Syndicate'),
    ('Dividend'), ('Manuscript'), ('Catalyst'), ('Silhouette'), ('Reservoir');

-- ============================================================================
-- DONE! Your Daily Bars database is ready 🔥
-- ============================================================================
