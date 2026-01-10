-- ============================================================================
-- DAILY BARS COMPLETE DATABASE SETUP
-- Run this ENTIRE file in your Supabase SQL Editor to fix all "relation does not exist" errors.
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE (Must be created first!)
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
    level INTEGER DEFAULT 1,
    role TEXT DEFAULT 'user',
    subscription_status TEXT DEFAULT 'free',
    storage_used_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 104857600 -- 100MB default
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 2. BARS TABLE
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

CREATE INDEX IF NOT EXISTS idx_bars_username ON bars(username);
CREATE INDEX IF NOT EXISTS idx_bars_created_at ON bars(created_at DESC);

-- ============================================================================
-- 3. SONGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS songs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    blocks JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    is_favorite BOOLEAN DEFAULT FALSE,
    cover_image TEXT,
    beat_url TEXT,
    video_url TEXT,
    studio TEXT DEFAULT '',
    producer TEXT DEFAULT '',
    otherArtists TEXT DEFAULT '',
    "key" TEXT DEFAULT '',
    bpm INTEGER,
    username TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_username ON songs(username);
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);

-- ============================================================================
-- 4. SCRATCH LAB SESSIONS (Dependencies: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scratch_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    title TEXT DEFAULT 'Untitled Session',
    beat_url TEXT,
    beat_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scratch_sessions_user ON scratch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_created_at ON scratch_sessions(created_at DESC);

-- ============================================================================
-- 5. SCRATCH LAYERS (Dependencies: scratch_sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scratch_layers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES scratch_sessions(id) ON DELETE CASCADE,
    layer_number INTEGER NOT NULL,
    audio_url TEXT NOT NULL,
    waveform_data JSONB DEFAULT '[]',
    volume INTEGER DEFAULT 80,
    pan NUMERIC DEFAULT 0,
    muted BOOLEAN DEFAULT FALSE,
    solo BOOLEAN DEFAULT FALSE,
    duration_seconds NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scratch_layers_session ON scratch_layers(session_id);

-- ============================================================================
-- 6. BEATS TABLE (Dependencies: users, songs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS beats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    title TEXT,
    artist TEXT,
    album TEXT,
    bpm INTEGER,
    key TEXT,
    genre TEXT,
    mood TEXT,
    tags TEXT,
    duration_seconds NUMERIC,
    detected_bpm NUMERIC,
    detected_bpm_confidence NUMERIC,
    detected_key TEXT,
    detected_key_confidence NUMERIC,
    detected_energy NUMERIC,
    detected_danceability NUMERIC,
    waveform_data JSONB,
    embedded_title TEXT,
    embedded_artist TEXT,
    embedded_album TEXT,
    embedded_year TEXT,
    embedded_genre TEXT,
    analysis_status TEXT DEFAULT 'pending',
    analysis_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beats_user_id ON beats(user_id);

-- ============================================================================
-- 7. COLLABORATORS (Dependencies: songs, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS song_collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    role TEXT DEFAULT 'editor',
    invite_token TEXT,
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_collaborators_song_id ON song_collaborators(song_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_collaborators_token ON song_collaborators(invite_token);

-- ============================================================================
-- 8. PROMPTS TABLES (The Daily Deposit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompts_feelings ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS prompts_settings ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS prompts_objects ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS prompts_smells ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );
CREATE TABLE IF NOT EXISTS prompts_vocab ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() );

-- ============================================================================
-- 9. COMMUNITY SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    author TEXT DEFAULT 'Anonymous',
    likes INTEGER DEFAULT 0,
    submission_type TEXT DEFAULT 'PROMPT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. RLS POLICIES (Make everything public for now)
-- ============================================================================
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', t);
        EXECUTE format('CREATE POLICY "Public Access" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP; 
END $$;

-- ============================================================================
-- 11. SEED DATA (If empty)
-- ============================================================================
INSERT INTO prompts_feelings (value) SELECT 'Confidence' WHERE NOT EXISTS (SELECT 1 FROM prompts_feelings LIMIT 1);
INSERT INTO prompts_settings (value) SELECT 'Oakland' WHERE NOT EXISTS (SELECT 1 FROM prompts_settings LIMIT 1);
INSERT INTO prompts_objects (value) SELECT 'A gold chain' WHERE NOT EXISTS (SELECT 1 FROM prompts_objects LIMIT 1);
INSERT INTO prompts_smells (value) SELECT 'Burnt rubber' WHERE NOT EXISTS (SELECT 1 FROM prompts_smells LIMIT 1);
INSERT INTO prompts_vocab (value) SELECT 'Syndicate' WHERE NOT EXISTS (SELECT 1 FROM prompts_vocab LIMIT 1);

-- Seed a default user if none exists (prevents foreign key errors for testing)
INSERT INTO users (id, username, email, password, role) 
SELECT '00000000-0000-0000-0000-000000000000', 'guap', 'guapdad@gmail.com', 'hashedpassword', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'guap');

-- ============================================================================
-- DONE!
-- ============================================================================
