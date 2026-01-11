-- ============================================================================
-- FIX TOTAL_BARS FIELD FOR ALL USERS
-- Run this to populate the total_bars field with actual bar counts
-- ============================================================================

-- Update all users' total_bars field
UPDATE users u
SET total_bars = (
    SELECT COUNT(*) 
    FROM bars b 
    WHERE b.username = u.username
)
WHERE EXISTS (
    SELECT 1 FROM bars b WHERE b.username = u.username
);

-- Verify the update
SELECT username, total_bars FROM users WHERE total_bars > 0 ORDER BY total_bars DESC;
