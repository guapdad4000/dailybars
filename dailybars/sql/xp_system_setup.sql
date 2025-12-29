-- ============================================================================
-- DAILY BARS XP SYSTEM SETUP
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Add XP column to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Add image_url and category columns to trophies table if not exists  
ALTER TABLE trophies 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'misc';

-- 3. Create user_trophies table if not exists (for tracking unlocks)
CREATE TABLE IF NOT EXISTS user_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trophy_id UUID REFERENCES trophies(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, trophy_id)
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_trophy_id ON user_trophies(trophy_id);

-- 5. Enable RLS on user_trophies
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user_trophies (allow users to see and create their own unlocks)
DROP POLICY IF EXISTS "Users can view their own trophies" ON user_trophies;
CREATE POLICY "Users can view their own trophies" ON user_trophies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can unlock trophies" ON user_trophies;
CREATE POLICY "Users can unlock trophies" ON user_trophies
    FOR INSERT WITH CHECK (true);

-- 7. Give existing users some starting XP based on their bar count
UPDATE users 
SET xp = COALESCE(xp, 0) + (
    SELECT COUNT(*) * 5 FROM bars WHERE bars.username = users.username
)
WHERE xp IS NULL OR xp = 0;

-- Success message
SELECT 'XP System Setup Complete!' as status;
