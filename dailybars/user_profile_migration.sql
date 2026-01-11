-- ============================================================================
-- DAILY BARS USER PROFILE & UPVOTE TRACKING MIGRATION
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. UPDATE USERS TABLE - Add streak and trophy tracking fields
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS total_bars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS selected_trophies TEXT[] DEFAULT '{}';

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_date);

COMMENT ON COLUMN users.current_streak IS 'Current consecutive days of activity';
COMMENT ON COLUMN users.longest_streak IS 'Longest streak ever achieved';
COMMENT ON COLUMN users.last_activity_date IS 'Last date user created a bar or logged in';
COMMENT ON COLUMN users.total_bars IS 'Total number of bars created';
COMMENT ON COLUMN users.selected_trophies IS 'Array of up to 3 trophy IDs to display on profile';

-- ============================================================================
-- 2. CREATE TROPHIES TABLE - Define available trophies
-- ============================================================================
CREATE TABLE IF NOT EXISTS trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement_type TEXT NOT NULL, -- 'bars', 'streak', 'xp', 'special'
    requirement_value INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial trophies
INSERT INTO trophies (name, description, icon, requirement_type, requirement_value) VALUES
('First Bar', 'Created your first bar', '✍️', 'bars', 1),
('10 Bars Deep', 'Created 10 bars', '🔥', 'bars', 10),
('50 Bars Strong', 'Created 50 bars', '💪', 'bars', 50),
('Century Club', 'Created 100 bars', '💯', 'bars', 100),
('Prolific Writer', 'Created 250 bars', '📝', 'bars', 250),
('Oakland Legend', 'Created 500 bars', '👑', 'bars', 500),
('Streak Starter', '3 day streak', '🔥', 'streak', 3),
('On Fire', '7 day streak', '🎯', 'streak', 7),
('Unstoppable', '14 day streak', '⚡', 'streak', 14),
('Monthly Master', '30 day streak', '🌟', 'streak', 30),
('XP Rookie', 'Earned 100 XP', '🎖️', 'xp', 100),
('XP Pro', 'Earned 500 XP', '🏆', 'xp', 500),
('XP Legend', 'Earned 1000 XP', '💎', 'xp', 1000),
('Early Adopter', 'Joined Daily Bars', '🚀', 'special', 0),
('Community Member', 'Submitted to Syndicate', '🤝', 'special', 0)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. CREATE USER_TROPHIES TABLE - Track earned trophies per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_trophies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trophy_id UUID REFERENCES trophies(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, trophy_id)
);

CREATE INDEX IF NOT EXISTS idx_user_trophies_user ON user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_earned ON user_trophies(earned_at DESC);

-- ============================================================================
-- 4. CREATE UPVOTES TABLE - Track community submission upvotes
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_upvotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES community_submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_submission ON community_upvotes(submission_id);
CREATE INDEX IF NOT EXISTS idx_community_upvotes_user ON community_upvotes(user_id);

COMMENT ON TABLE community_upvotes IS 'Tracks which users upvoted which community submissions - prevents duplicate voting';

-- ============================================================================
-- 5. UPDATE RLS POLICIES FOR NEW TABLES
-- ============================================================================
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON trophies;
CREATE POLICY "Public Access" ON trophies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON user_trophies;
CREATE POLICY "Public Access" ON user_trophies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON community_upvotes;
CREATE POLICY "Public Access" ON community_upvotes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. FUNCTION TO UPDATE USER STATS (Call this when bars are created)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_stats(p_username TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_bar_count INTEGER;
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get user ID and current stats
    SELECT id, current_streak, longest_streak, last_activity_date 
    INTO v_user_id, v_current_streak, v_longest_streak, v_last_activity
    FROM users 
    WHERE username = p_username;
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Count total bars
    SELECT COUNT(*) INTO v_bar_count FROM bars WHERE username = p_username;
    
    -- Calculate streak
    IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak broken or first activity
        v_current_streak := 1;
    ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        v_current_streak := v_current_streak + 1;
    ELSIF v_last_activity = CURRENT_DATE THEN
        -- Same day activity - no change to streak
        v_current_streak := v_current_streak;
    ELSE
        -- Future date somehow? Reset
        v_current_streak := 1;
    END IF;
    
    -- Update longest streak if current is higher
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;
    
    -- Update user record
    UPDATE users 
    SET 
        total_bars = v_bar_count,
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = CURRENT_DATE
    WHERE id = v_user_id;
    
    -- Auto-award trophies based on achievements
    -- Bar count trophies
    INSERT INTO user_trophies (user_id, trophy_id)
    SELECT v_user_id, t.id
    FROM trophies t
    WHERE t.requirement_type = 'bars' 
      AND v_bar_count >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = v_user_id AND ut.trophy_id = t.id
      )
    ON CONFLICT DO NOTHING;
    
    -- Streak trophies
    INSERT INTO user_trophies (user_id, trophy_id)
    SELECT v_user_id, t.id
    FROM trophies t
    WHERE t.requirement_type = 'streak' 
      AND v_current_streak >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = v_user_id AND ut.trophy_id = t.id
      )
    ON CONFLICT DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION TO CHECK AND AWARD XP TROPHIES
-- ============================================================================
CREATE OR REPLACE FUNCTION check_xp_trophies(p_user_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_trophies (user_id, trophy_id)
    SELECT p_user_id, t.id
    FROM trophies t
    WHERE t.requirement_type = 'xp' 
      AND p_xp >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = p_user_id AND ut.trophy_id = t.id
      )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. BACKFILL EXISTING USER STATS (Run once after migration)
-- ============================================================================
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT username FROM users
    LOOP
        PERFORM update_user_stats(user_rec.username);
    END LOOP;
END $$;

-- Award "Early Adopter" trophy to all existing users
INSERT INTO user_trophies (user_id, trophy_id)
SELECT u.id, t.id
FROM users u
CROSS JOIN trophies t
WHERE t.name = 'Early Adopter'
  AND NOT EXISTS (
      SELECT 1 FROM user_trophies ut 
      WHERE ut.user_id = u.id AND ut.trophy_id = t.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Update frontend to call update_user_stats() when bars are created
-- 2. Update frontend to use community_upvotes table instead of localStorage
-- 3. Add user profile modal to display stats and trophies
-- ============================================================================
