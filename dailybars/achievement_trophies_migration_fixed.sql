-- ============================================================================
-- DAILY BARS ACHIEVEMENT TROPHIES & UPVOTE TRACKING MIGRATION (FIXED)
-- This adds FREE auto-awarded achievement trophies alongside existing XP Store trophies
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
-- 2. UPDATE TROPHIES TABLE - Add fields to support both store and achievement trophies
-- ============================================================================
-- Add new columns to existing trophies table
ALTER TABLE trophies 
ADD COLUMN IF NOT EXISTS trophy_type TEXT DEFAULT 'store', -- 'store' (purchasable) or 'achievement' (auto-awarded)
ADD COLUMN IF NOT EXISTS requirement_type TEXT, -- 'bars', 'streak', 'xp', 'special' (for achievements only)
ADD COLUMN IF NOT EXISTS requirement_value INTEGER, -- threshold for achievement (for achievements only)
ADD COLUMN IF NOT EXISTS image_url TEXT; -- URL for trophy image

-- Add index
CREATE INDEX IF NOT EXISTS idx_trophies_type ON trophies(trophy_type);

COMMENT ON COLUMN trophies.trophy_type IS 'Type: store (purchasable with XP) or achievement (auto-awarded)';
COMMENT ON COLUMN trophies.requirement_type IS 'For achievements: bars, streak, xp, special';
COMMENT ON COLUMN trophies.requirement_value IS 'For achievements: threshold value to unlock';

-- ============================================================================
-- 3. INSERT ACHIEVEMENT TROPHIES (Free milestone trophies)
-- ============================================================================
-- These are awarded automatically based on achievements
-- Use DO block to handle potential conflicts gracefully
DO $$
BEGIN
    -- Bar Count Achievements
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'First Bar', 'Created your first bar', '✍️', 0, '#4B5563', 'achievement', 'bars', 1
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'First Bar');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT '10 Bars Deep', 'Created 10 bars', '🔥', 0, '#EF4444', 'achievement', 'bars', 10
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = '10 Bars Deep');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT '50 Bars Strong', 'Created 50 bars', '💪', 0, '#F59E0B', 'achievement', 'bars', 50
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = '50 Bars Strong');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Century Club', 'Created 100 bars', '💯', 0, '#10B981', 'achievement', 'bars', 100
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Century Club');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Prolific Writer', 'Created 250 bars', '📝', 0, '#3B82F6', 'achievement', 'bars', 250
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Prolific Writer');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Oakland Legend', 'Created 500 bars', '👑', 0, '#8B5CF6', 'achievement', 'bars', 500
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Oakland Legend');
    
    -- Streak Achievements
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Streak Starter', '3 day streak', '🔥', 0, '#EF4444', 'achievement', 'streak', 3
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Streak Starter');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'On Fire', '7 day streak', '🎯', 0, '#F59E0B', 'achievement', 'streak', 7
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'On Fire');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Unstoppable', '14 day streak', '⚡', 0, '#10B981', 'achievement', 'streak', 14
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Unstoppable');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Monthly Master', '30 day streak', '🌟', 0, '#FACC15', 'achievement', 'streak', 30
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Monthly Master');
    
    -- XP Milestones
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'XP Rookie', 'Earned 100 XP', '🎖️', 0, '#4B5563', 'achievement', 'xp', 100
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'XP Rookie');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'XP Pro', 'Earned 500 XP', '🏆', 0, '#F59E0B', 'achievement', 'xp', 500
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'XP Pro');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'XP Legend', 'Earned 1000 XP', '💎', 0, '#8B5CF6', 'achievement', 'xp', 1000
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'XP Legend');
    
    -- Special Achievements
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Early Adopter', 'Joined Daily Bars', '🚀', 0, '#3B82F6', 'achievement', 'special', 0
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Early Adopter');
    
    INSERT INTO trophies (name, description, icon, xp_cost, color, trophy_type, requirement_type, requirement_value)
    SELECT 'Community Member', 'Submitted to Syndicate', '🤝', 0, '#10B981', 'achievement', 'special', 0
    WHERE NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Community Member');
END $$;

-- ============================================================================
-- 4. UPDATE USER_TROPHIES TABLE - Add earned_via field
-- ============================================================================
ALTER TABLE user_trophies 
ADD COLUMN IF NOT EXISTS earned_via TEXT DEFAULT 'purchase'; -- 'purchase' or 'achievement'

COMMENT ON COLUMN user_trophies.earned_via IS 'How trophy was obtained: purchase (XP store) or achievement (auto-awarded)';

-- ============================================================================
-- 5. CREATE UPVOTES TABLE - Track community submission upvotes
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
-- 6. UPDATE RLS POLICIES FOR NEW TABLE
-- ============================================================================
ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON community_upvotes;
CREATE POLICY "Public Access" ON community_upvotes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. FUNCTION TO UPDATE USER STATS (Call this when bars are created)
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
    
    -- Auto-award achievement trophies based on achievements
    -- Bar count trophies
    INSERT INTO user_trophies (user_id, trophy_id, earned_via)
    SELECT v_user_id, t.id, 'achievement'
    FROM trophies t
    WHERE t.trophy_type = 'achievement'
      AND t.requirement_type = 'bars' 
      AND v_bar_count >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = v_user_id AND ut.trophy_id = t.id
      );
    
    -- Streak trophies
    INSERT INTO user_trophies (user_id, trophy_id, earned_via)
    SELECT v_user_id, t.id, 'achievement'
    FROM trophies t
    WHERE t.trophy_type = 'achievement'
      AND t.requirement_type = 'streak' 
      AND v_current_streak >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = v_user_id AND ut.trophy_id = t.id
      );
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION TO CHECK AND AWARD XP TROPHIES
-- ============================================================================
CREATE OR REPLACE FUNCTION check_xp_trophies(p_user_id UUID, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_trophies (user_id, trophy_id, earned_via)
    SELECT p_user_id, t.id, 'achievement'
    FROM trophies t
    WHERE t.trophy_type = 'achievement'
      AND t.requirement_type = 'xp' 
      AND p_xp >= t.requirement_value
      AND NOT EXISTS (
          SELECT 1 FROM user_trophies ut 
          WHERE ut.user_id = p_user_id AND ut.trophy_id = t.id
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. BACKFILL EXISTING USER STATS (Run once after migration)
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

-- Award "Early Adopter" achievement trophy to all existing users
INSERT INTO user_trophies (user_id, trophy_id, earned_via)
SELECT u.id, t.id, 'achievement'
FROM users u
CROSS JOIN trophies t
WHERE t.name = 'Early Adopter'
  AND t.trophy_type = 'achievement'
  AND NOT EXISTS (
      SELECT 1 FROM user_trophies ut 
      WHERE ut.user_id = u.id AND ut.trophy_id = t.id
  );

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Summary:
-- 1. ✅ Added streak tracking to users table
-- 2. ✅ Extended trophies table to support both store and achievement types
-- 3. ✅ Inserted 15 FREE achievement trophies (auto-awarded)
-- 4. ✅ Created community_upvotes table for vote tracking
-- 5. ✅ Created functions for auto-awarding trophies
-- 6. ✅ Backfilled existing user stats
--
-- Your existing ~99 store trophies remain unchanged!
-- New achievement trophies are separate and free to earn
-- ============================================================================
