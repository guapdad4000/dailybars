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
-- ============================================================================

CREATE TABLE IF NOT EXISTS beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
    
    -- File metadata
    filename TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds FLOAT,
    
    -- Storage info
    storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
    public_url TEXT,
    
    -- Metadata
    title TEXT,
    artist TEXT,
    bpm INTEGER,
    key TEXT,
    tags TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for beats
CREATE INDEX IF NOT EXISTS idx_beats_user_id ON beats(user_id);
CREATE INDEX IF NOT EXISTS idx_beats_song_id ON beats(song_id);
CREATE INDEX IF NOT EXISTS idx_beats_created_at ON beats(created_at DESC);

-- ============================================================================
-- 3. CREATE SONG COLLABORATORS TABLE (for real-time collab)
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
-- 4. UPDATE SONGS TABLE - Add collaboration fields
-- ============================================================================

ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS collaborator_count INTEGER DEFAULT 0;

-- ============================================================================
-- 5. STORAGE BUCKET SETUP (Run separately in Storage settings)
-- ============================================================================

-- NOTE: Create bucket manually in Supabase Dashboard > Storage > New Bucket
-- Bucket name: beats
-- Public: false (we'll use signed URLs)
-- File size limit: 50MB
-- Allowed MIME types: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/aac, audio/ogg, audio/webm, audio/flac

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
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

-- ============================================================================
-- 7. HELPER FUNCTIONS
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

-- ============================================================================
-- 8. SET DEFAULT STORAGE LIMITS
-- ============================================================================

-- Premium users: 500MB (524288000 bytes)
-- Free users: 0 (can't upload)
-- Admins: Unlimited (0 = no limit check)

UPDATE users SET storage_limit_bytes = 524288000 WHERE subscription_status IN ('premium', 'lifetime');
UPDATE users SET storage_limit_bytes = 0 WHERE role = 'admin'; -- 0 means unlimited for admins

-- ============================================================================
-- 9. CREATE ADMIN USER (Update with your actual user ID/email)
-- ============================================================================

-- Option 1: Set admin by user ID
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE id = 'YOUR-USER-UUID';

-- Option 2: Set admin by username
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE username = 'guapdad4000';

-- Option 3: Set admin by email (if you have email column)
-- UPDATE users SET role = 'admin', subscription_status = 'lifetime' WHERE email = 'admin@example.com';

-- ============================================================================
-- 10. STORAGE BUCKET POLICIES (Apply in Supabase Dashboard > Storage > Policies)
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
-- 2. Apply storage policies from section 10
-- 3. Set your admin user using one of the commands in section 9
-- ============================================================================
