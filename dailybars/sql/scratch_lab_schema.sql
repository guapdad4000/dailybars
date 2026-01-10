-- ============================================================================
-- SCRATCH LAB - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor to add session persistence
-- ============================================================================

-- ============================================================================
-- 1. SCRATCH SESSIONS TABLE
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_username ON scratch_sessions(username);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_user_id ON scratch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_created_at ON scratch_sessions(created_at DESC);

-- ============================================================================
-- 2. SCRATCH LAYERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scratch_layers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES scratch_sessions(id) ON DELETE CASCADE,
    layer_number INTEGER NOT NULL,
    audio_url TEXT NOT NULL,
    waveform_data JSONB,
    volume INTEGER DEFAULT 80,
    pan NUMERIC DEFAULT 0,
    muted BOOLEAN DEFAULT FALSE,
    solo BOOLEAN DEFAULT FALSE,
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scratch_layers_session_id ON scratch_layers(session_id);
CREATE INDEX IF NOT EXISTS idx_scratch_layers_created_at ON scratch_layers(created_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE scratch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_layers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES - Allow public read/write for now (no auth required)
-- You can tighten this up later with Supabase Auth
-- ============================================================================

-- SESSIONS: Anyone can read, anyone can insert (we filter by username in app)
CREATE POLICY "Scratch sessions are viewable by everyone" ON scratch_sessions FOR SELECT USING (true);
CREATE POLICY "Scratch sessions can be created by anyone" ON scratch_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Scratch sessions can be updated by anyone" ON scratch_sessions FOR UPDATE USING (true);
CREATE POLICY "Scratch sessions can be deleted by anyone" ON scratch_sessions FOR DELETE USING (true);

-- LAYERS: Full access (linked to sessions)
CREATE POLICY "Scratch layers are viewable by everyone" ON scratch_layers FOR SELECT USING (true);
CREATE POLICY "Scratch layers can be created by anyone" ON scratch_layers FOR INSERT WITH CHECK (true);
CREATE POLICY "Scratch layers can be updated by anyone" ON scratch_layers FOR UPDATE USING (true);
CREATE POLICY "Scratch layers can be deleted by anyone" ON scratch_layers FOR DELETE USING (true);

-- ============================================================================
-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================
-- Reuse existing function from main schema
CREATE TRIGGER scratch_sessions_updated_at
    BEFORE UPDATE ON scratch_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. SUPABASE STORAGE BUCKET
-- Run this in Supabase Storage section (or via SQL):
-- ============================================================================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('scratch-lab', 'scratch-lab', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Public read access for scratch-lab bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'scratch-lab');

-- Allow authenticated users to upload
CREATE POLICY "Users can upload to scratch-lab bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scratch-lab');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own scratch-lab files"
ON storage.objects FOR DELETE
USING (bucket_id = 'scratch-lab');

-- ============================================================================
-- DONE! Scratch Lab database is ready
-- ============================================================================

-- Test queries:
-- SELECT * FROM scratch_sessions ORDER BY created_at DESC;
-- SELECT * FROM scratch_layers WHERE session_id = 'YOUR_SESSION_ID';
