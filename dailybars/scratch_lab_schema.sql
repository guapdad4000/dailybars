-- ============================================================================
-- SCRATCH LAB SESSIONS - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor to enable Save/Load functionality
-- ============================================================================

-- 1. SESSIONS TABLE (Container for a scratch project)
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

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_user ON scratch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_username ON scratch_sessions(username);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_created_at ON scratch_sessions(created_at DESC);

-- 2. LAYERS TABLE (Individual audio tracks)
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

-- Index for layers
CREATE INDEX IF NOT EXISTS idx_scratch_layers_session ON scratch_layers(session_id);

-- 3. RLS POLICIES (Row Level Security)
ALTER TABLE scratch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_layers ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (or restrict to owner if auth is set up)
CREATE POLICY "Scratch sessions viewable by everyone" ON scratch_sessions FOR SELECT USING (true);
CREATE POLICY "Scratch sessions insertable by everyone" ON scratch_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Scratch sessions updatable by everyone" ON scratch_sessions FOR UPDATE USING (true);
CREATE POLICY "Scratch sessions deletable by everyone" ON scratch_sessions FOR DELETE USING (true);

CREATE POLICY "Scratch layers viewable by everyone" ON scratch_layers FOR SELECT USING (true);
CREATE POLICY "Scratch layers insertable by everyone" ON scratch_layers FOR INSERT WITH CHECK (true);
CREATE POLICY "Scratch layers updatable by everyone" ON scratch_layers FOR UPDATE USING (true);
CREATE POLICY "Scratch layers deletable by everyone" ON scratch_layers FOR DELETE USING (true);

-- 4. STORAGE BUCKET POLICY (If you haven't created 'scratch-lab' bucket yet)
-- Go to Storage -> New Bucket -> 'scratch-lab' -> Public
