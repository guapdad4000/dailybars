-- ============================================================================
-- DAILY BARS - Beat Storage & User Roles Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. UPDATE USERS TABLE - Add role and subscription fields
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'lifetime'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 0; -- 0 = no limit for admins

-- Index for quick role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status);

-- ============================================================================
-- 2. CREATE BEAT STORAGE TABLE
-- ALL METADATA FIELDS ARE OPTIONAL - Users can upload beats without knowing info
-- ============================================================================

CREATE TABLE IF NOT EXISTS beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
    
    -- File metadata (only filename and storage_path required for upload)
    filename TEXT NOT NULL,
    original_filename TEXT,           -- Can be NULL
    file_size_bytes BIGINT DEFAULT 0, -- Will be set on upload, default 0 if unknown
    mime_type TEXT DEFAULT 'audio/mpeg', -- Default to mp3 if unknown
    duration_seconds FLOAT,           -- NULL = not analyzed yet
    
    -- Storage info
    storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
    public_url TEXT,            -- Can be NULL until signed URL generated
    
    -- ALL METADATA IS OPTIONAL - Can be blank on import
    title TEXT,                 -- NULL = untitled
    artist TEXT,                -- NULL = unknown artist
    album TEXT,                 -- NULL = no album
    bpm INTEGER,                -- NULL = not detected
    key TEXT,                   -- NULL = not detected (e.g., 'C Major', 'A Minor')
    time_signature TEXT,        -- NULL = not detected (e.g., '4/4', '3/4')
    genre TEXT,                 -- NULL = not detected
    mood TEXT,                  -- NULL = not detected
    energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
    tags TEXT[],                -- Empty array = no tags
    
    -- Audio Analysis Results (Premium/Admin feature)
    -- These get populated by auto-detection
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    analysis_requested_at TIMESTAMPTZ,
    analysis_completed_at TIMESTAMPTZ,
    analysis_error TEXT,
    
    -- Detected audio features (from Web Audio API or backend analysis)
    detected_bpm FLOAT,              -- Raw detected BPM (might be decimal)
    detected_bpm_confidence FLOAT,   -- 0-1 confidence score
    detected_key TEXT,               -- Detected musical key
    detected_key_confidence FLOAT,   -- 0-1 confidence score
    detected_energy FLOAT,           -- 0-1 energy level
    detected_danceability FLOAT,     -- 0-1 danceability score
    waveform_data JSONB,             -- Waveform peaks for visualization
    frequency_data JSONB,            -- Frequency analysis data
    
    -- ID3/Metadata extracted from file
    embedded_title TEXT,
    embedded_artist TEXT,
    embedded_album TEXT,
    embedded_year INTEGER,
    embedded_genre TEXT,
    cover_art_url TEXT,              -- Extracted album art
    
    -- Usage tracking
    play_count INTEGER DEFAULT 0,
    last_played_at TIMESTAMPTZ,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for beats
CREATE INDEX IF NOT EXISTS idx_beats_user_id ON beats(user_id);
CREATE INDEX IF NOT EXISTS idx_beats_song_id ON beats(song_id);
CREATE INDEX IF NOT EXISTS idx_beats_created_at ON beats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beats_bpm ON beats(bpm) WHERE bpm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beats_key ON beats(key) WHERE key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beats_analysis_status ON beats(analysis_status);

-- ============================================================================
-- 3. CREATE BEAT ANALYSIS QUEUE (for background processing)
-- Premium/Admin feature for auto-detecting BPM, key, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS beat_analysis_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beat_id UUID REFERENCES beats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Queue status
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest. Admins get priority 1
    
    -- Analysis options
    detect_bpm BOOLEAN DEFAULT true,
    detect_key BOOLEAN DEFAULT true,
    detect_energy BOOLEAN DEFAULT true,
    generate_waveform BOOLEAN DEFAULT true,
    extract_metadata BOOLEAN DEFAULT true,
    
    -- Processing info
    worker_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON beat_analysis_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_beat ON beat_analysis_queue(beat_id);

-- ============================================================================
-- 4. CREATE SONG COLLABORATORS TABLE (for real-time collab)
-- ============================================================================

CREATE TABLE IF NOT EXISTS song_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    
    -- Invite system
    invite_token TEXT UNIQUE,
    invited_by UUID REFERENCES users(id),
    
    -- Permissions
    role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'owner')),
    can_invite BOOLEAN DEFAULT false,
    
    -- Timestamps
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate user-song combos
    UNIQUE(song_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_song_collaborators_song ON song_collaborators(song_id);
CREATE INDEX IF NOT EXISTS idx_song_collaborators_user ON song_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_song_collaborators_token ON song_collaborators(invite_token);

-- ============================================================================
-- 5. UPDATE SONGS TABLE - Add collaboration fields
-- ============================================================================

ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS collaborator_count INTEGER DEFAULT 0;

-- ============================================================================
-- 6. STORAGE BUCKET SETUP (Run separately in Storage settings)
-- ============================================================================

-- NOTE: Create bucket manually in Supabase Dashboard > Storage > New Bucket
-- Bucket name: beats
-- Public: false (we'll use signed URLs)
-- File size limit: 50MB
-- Allowed MIME types: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/aac, audio/ogg, audio/webm, audio/flac

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on beats table
ALTER TABLE beats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own beats
CREATE POLICY "Users can view own beats" ON beats
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Premium/Admin users can insert beats
CREATE POLICY "Premium users can upload beats" ON beats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.subscription_status IN ('premium', 'lifetime'))
        )
    );

-- Policy: Users can update their own beats
CREATE POLICY "Users can update own beats" ON beats
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own beats
CREATE POLICY "Users can delete own beats" ON beats
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to beats" ON beats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Enable RLS on song_collaborators
ALTER TABLE song_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see collaborators for songs they're part of
CREATE POLICY "Users can view song collaborators" ON song_collaborators
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM song_collaborators sc 
            WHERE sc.song_id = song_collaborators.song_id 
            AND sc.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_collaborators.song_id 
            AND songs.user_id = auth.uid()
        )
    );

-- Policy: Song owners can add collaborators
CREATE POLICY "Song owners can add collaborators" ON song_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = song_id 
            AND songs.user_id = auth.uid()
        )
    );

-- Enable RLS on analysis queue
ALTER TABLE beat_analysis_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own analysis requests
CREATE POLICY "Users can view own analysis queue" ON beat_analysis_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Premium/Admin users can request analysis
CREATE POLICY "Premium users can request analysis" ON beat_analysis_queue
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role = 'admin' OR users.subscription_status IN ('premium', 'lifetime'))
        )
    );

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can upload beats
CREATE OR REPLACE FUNCTION can_upload_beats(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid 
        AND (role = 'admin' OR subscription_status IN ('premium', 'lifetime'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use auto-detection
CREATE OR REPLACE FUNCTION can_use_auto_detection(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_uuid 
        AND (role = 'admin' OR subscription_status IN ('premium', 'lifetime'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's remaining storage
CREATE OR REPLACE FUNCTION get_remaining_storage(user_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT storage_used_bytes, storage_limit_bytes, role 
    INTO user_record 
    FROM users 
    WHERE id = user_uuid;
    
    -- Admins have unlimited storage
    IF user_record.role = 'admin' THEN
        RETURN -1; -- -1 means unlimited
    END IF;
    
    -- Calculate remaining
    RETURN GREATEST(0, user_record.storage_limit_bytes - user_record.storage_used_bytes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET storage_used_bytes = storage_used_bytes - OLD.file_size_bytes
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update storage usage
DROP TRIGGER IF EXISTS beats_storage_trigger ON beats;
CREATE TRIGGER beats_storage_trigger
    AFTER INSERT OR DELETE ON beats
    FOR EACH ROW
    EXECUTE FUNCTION update_storage_usage();

-- Function to queue beat for analysis (Premium/Admin only)
CREATE OR REPLACE FUNCTION queue_beat_analysis(
    p_beat_id UUID,
    p_user_id UUID,
    p_detect_bpm BOOLEAN DEFAULT true,
    p_detect_key BOOLEAN DEFAULT true,
    p_detect_energy BOOLEAN DEFAULT true,
    p_generate_waveform BOOLEAN DEFAULT true,
    p_extract_metadata BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_priority INTEGER;
    v_user_role TEXT;
BEGIN
    -- Check if user can use auto-detection
    IF NOT can_use_auto_detection(p_user_id) THEN
        RAISE EXCEPTION 'User does not have permission to use auto-detection';
    END IF;
    
    -- Get user role for priority
    SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
    
    -- Admins get highest priority
    IF v_user_role = 'admin' THEN
        v_priority := 1;
    ELSE
        v_priority := 5;
    END IF;
    
    -- Insert into queue
    INSERT INTO beat_analysis_queue (
        beat_id, user_id, priority,
        detect_bpm, detect_key, detect_energy,
        generate_waveform, extract_metadata
    ) VALUES (
        p_beat_id, p_user_id, v_priority,
        p_detect_bpm, p_detect_key, p_detect_energy,
        p_generate_waveform, p_extract_metadata
    )
    RETURNING id INTO v_queue_id;
    
    -- Update beat status
    UPDATE beats 
    SET analysis_status = 'processing', 
        analysis_requested_at = NOW()
    WHERE id = p_beat_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update beat with analysis results
CREATE OR REPLACE FUNCTION update_beat_analysis(
    p_beat_id UUID,
    p_detected_bpm FLOAT DEFAULT NULL,
    p_detected_bpm_confidence FLOAT DEFAULT NULL,
    p_detected_key TEXT DEFAULT NULL,
    p_detected_key_confidence FLOAT DEFAULT NULL,
    p_detected_energy FLOAT DEFAULT NULL,
    p_detected_danceability FLOAT DEFAULT NULL,
    p_waveform_data JSONB DEFAULT NULL,
    p_duration_seconds FLOAT DEFAULT NULL,
    p_embedded_title TEXT DEFAULT NULL,
    p_embedded_artist TEXT DEFAULT NULL,
    p_embedded_album TEXT DEFAULT NULL,
    p_embedded_year INTEGER DEFAULT NULL,
    p_embedded_genre TEXT DEFAULT NULL,
    p_cover_art_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE beats SET
        detected_bpm = COALESCE(p_detected_bpm, detected_bpm),
        detected_bpm_confidence = COALESCE(p_detected_bpm_confidence, detected_bpm_confidence),
        detected_key = COALESCE(p_detected_key, detected_key),
        detected_key_confidence = COALESCE(p_detected_key_confidence, detected_key_confidence),
        detected_energy = COALESCE(p_detected_energy, detected_energy),
        detected_danceability = COALESCE(p_detected_danceability, detected_danceability),
        waveform_data = COALESCE(p_waveform_data, waveform_data),
        duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
        embedded_title = COALESCE(p_embedded_title, embedded_title),
        embedded_artist = COALESCE(p_embedded_artist, embedded_artist),
        embedded_album = COALESCE(p_embedded_album, embedded_album),
        embedded_year = COALESCE(p_embedded_year, embedded_year),
        embedded_genre = COALESCE(p_embedded_genre, embedded_genre),
        cover_art_url = COALESCE(p_cover_art_url, cover_art_url),
        -- Auto-fill user-facing fields from detected/embedded if not set
        bpm = COALESCE(bpm, ROUND(p_detected_bpm)::INTEGER),
        key = COALESCE(key, p_detected_key),
        title = COALESCE(title, p_embedded_title),
        artist = COALESCE(artist, p_embedded_artist),
        album = COALESCE(album, p_embedded_album),
        genre = COALESCE(genre, p_embedded_genre),
        analysis_status = 'completed',
        analysis_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_beat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. SET DEFAULT STORAGE LIMITS
-- ============================================================================

-- Premium users: 500MB (524288000 bytes)
-- Free users: 0 (can't upload)
-- Admins: Unlimited (0 = no limit check)

UPDATE users SET storage_limit_bytes = 524288000 WHERE subscription_status IN ('premium', 'lifetime');
UPDATE users SET storage_limit_bytes = 0 WHERE role = 'admin'; -- 0 means unlimited for admins

-- ============================================================================
-- 10. CREATE ADMIN USER (Update with your actual user ID/email)
-- ============================================================================

-- Option 1: Set admin by user ID
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE id = 'YOUR-USER-UUID';

-- Option 2: Set admin by username
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE username = 'guapdad4000';

-- Option 3: Set admin by email (if you have email column)
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE email = 'admin@example.com';

-- ============================================================================
-- 11. STORAGE BUCKET POLICIES (Apply in Supabase Dashboard > Storage > Policies)
-- ============================================================================

/*
-- For the 'beats' bucket, create these policies:

-- SELECT (download) - Users can download their own beats
CREATE POLICY "Users can download own beats"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'beats' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT (upload) - Premium/Admin users can upload
CREATE POLICY "Premium users can upload beats"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'beats'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.subscription_status IN ('premium', 'lifetime'))
    )
);

-- DELETE - Users can delete their own beats
CREATE POLICY "Users can delete own beats"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'beats'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- ============================================================================
-- DONE! Remember to:
-- 1. Create 'beats' storage bucket in Supabase Dashboard
-- 2. Apply storage policies from section 11
-- 3. Set your admin user using one of the commands in section 10
-- 4. The frontend will handle auto-detection using Web Audio API
-- ============================================================================
