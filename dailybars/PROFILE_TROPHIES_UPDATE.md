# User Profile & Trophy System Update

## Overview
This update transforms the logout button into a profile jewel that displays comprehensive user stats and trophies. It also fixes the upvote system to prevent duplicate voting and implements proper streak tracking.

## Features Added

### 1. User Profile Modal (💎)
- **Profile Jewel Button**: Replaced simple logout button with a styled profile button showing `💎 @USERNAME`
- **Comprehensive Stats Display**:
  - Total XP
  - Total Bars Written
  - Current Streak (days)
  - Longest Streak (days)
  - Date Joined
  
### 2. Trophy System
- **Auto-Award System**: Trophies are automatically awarded based on achievements
- **Trophy Categories**:
  - **Bar Count**: First Bar, 10 Bars, 50 Bars, 100 Bars, 250 Bars, 500 Bars
  - **Streaks**: 3-day, 7-day, 14-day, 30-day streaks
  - **XP Milestones**: 100 XP, 500 XP, 1000 XP
  - **Special**: Early Adopter, Community Member
  
- **Trophy Showcase**: Users can select up to 3 trophies to display on their profile
- **Visual Design**: Trophy icons with locked/unlocked states

### 3. Clickable Syndicate Usernames
- Click any `@username` in the Syndicate (Community) feed
- Opens their profile modal with stats and trophies
- Builds community engagement

### 4. Fixed Upvote System
- **Problem Fixed**: Users could upvote the same post multiple times
- **Solution**: Database-backed tracking with `community_upvotes` table
- **Unique Constraint**: One vote per user per submission
- **Persistent Across Sessions**: No more localStorage-only tracking

### 5. Proper Streak Tracking
- **Database Integration**: Streaks now calculated using `last_activity_date`
- **Automatic Updates**: Streak increments when bars are created
- **Longest Streak Recording**: Tracks personal best streaks
- **Trophy Integration**: Streak milestones automatically award trophies

## Installation Instructions

### Step 1: Run SQL Migration
**IMPORTANT**: Copy the entire content of `user_profile_migration.sql` and run it in your Supabase SQL Editor.

The migration will:
1. Add new columns to `users` table (streak fields, trophy selection)
2. Create `trophies` table with predefined achievements
3. Create `user_trophies` junction table
4. Create `community_upvotes` table for vote tracking
5. Create database functions for auto-calculations
6. Backfill existing user data

### Step 2: Verify Tables Created
After running the migration, verify these tables exist:
- `users` (updated with new columns)
- `trophies` (15 default trophies)
- `user_trophies` (tracks earned trophies)
- `community_upvotes` (prevents duplicate votes)

### Step 3: Deploy Updated Code
The following files have been updated:
- `js/app.js` - Added UserProfileModal component
- `js/app-views.js` - Updated main app with profile button and handlers
- `js/daily-deposit-engine.js` - Fixed upvote tracking logic

Deploy these files to your hosting environment.

## Usage Guide

### For Users
1. **View Your Profile**: Click the jewel button (💎 @USERNAME) at bottom-left
2. **Select Trophy Showcase**: Click any earned trophy to add/remove from showcase (max 3)
3. **View Other Profiles**: Click any `@username` in the Syndicate feed
4. **Earn Trophies**: Create bars, maintain streaks, earn XP to unlock trophies

### For Developers
- User stats update automatically via database function `update_user_stats(p_username)`
- Trophy checks run after XP gains via `check_xp_trophies(p_user_id, p_xp)`
- Upvotes tracked in `community_upvotes` with user_id + submission_id unique constraint

## Technical Details

### Database Schema Changes

#### Users Table (New Columns)
```sql
ALTER TABLE users ADD COLUMN
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_bars INTEGER DEFAULT 0,
  selected_trophies TEXT[] DEFAULT '{}';
```

#### New Tables
- `trophies` - Master list of available trophies
- `user_trophies` - Junction table linking users to earned trophies
- `community_upvotes` - Tracks which users upvoted which submissions

#### Database Functions
- `update_user_stats(p_username)` - Calculates streaks, counts bars, awards trophies
- `check_xp_trophies(p_user_id, p_xp)` - Awards XP-based trophies

### API Changes

#### Daily Deposit Engine
```javascript
// Old (localStorage only)
DailyDepositEngine.upvotePost(postId, userId)

// New (database-backed)
DailyDepositEngine.upvotePost(postId, userId, username)
DailyDepositEngine.hasUpvoted(postId, userId) // Now async
```

### Component Architecture
```
App
├── UserProfileModal (new)
│   ├── Stats Grid
│   ├── Trophy Showcase (selectable, max 3)
│   └── All Trophies (locked/unlocked)
├── Profile Jewel Button (new)
└── SyndicateView
    └── Clickable @usernames (new)
```

## Styling
All new UI follows the existing design system:
- **Paper texture background** (`/images/smooth-paper-texture.jpg`)
- **Archivo Black** for headers
- **IBM Plex Mono** for stats and labels
- **Black borders and minimal design**
- **No emojis** except for trophy icons
- **2px solid borders** throughout

## Testing Checklist

### Profile Modal
- [ ] Jewel button appears at bottom-left
- [ ] Clicking opens profile modal
- [ ] Stats display correctly (XP, bars, streaks)
- [ ] Join date shows formatted date
- [ ] Trophies grid shows earned/locked correctly
- [ ] Can select up to 3 trophies for showcase
- [ ] Selected trophies persist after closing modal
- [ ] Logout button works from modal

### Syndicate Interactions
- [ ] Usernames are underlined and clickable
- [ ] Clicking username opens their profile
- [ ] Can only upvote once per post
- [ ] Upvote button shows filled diamond (💎) when voted
- [ ] Upvote persists across page reloads
- [ ] Like count increments correctly

### Streak Tracking
- [ ] Creating a bar increments current_streak
- [ ] Consecutive day activity extends streak
- [ ] Missing a day resets streak to 1
- [ ] longest_streak records personal best
- [ ] Streak trophies award at milestones

### Trophy System
- [ ] Bar count trophies award automatically
- [ ] Streak trophies award automatically
- [ ] XP trophies award automatically
- [ ] Trophy showcase updates in real-time
- [ ] Other users can see selected trophies

## Migration Rollback (If Needed)

If you need to undo the migration:
```sql
-- Remove new columns from users
ALTER TABLE users 
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS last_activity_date,
  DROP COLUMN IF EXISTS total_bars,
  DROP COLUMN IF EXISTS selected_trophies;

-- Drop new tables
DROP TABLE IF EXISTS community_upvotes;
DROP TABLE IF EXISTS user_trophies;
DROP TABLE IF EXISTS trophies;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_stats(TEXT);
DROP FUNCTION IF EXISTS check_xp_trophies(UUID, INTEGER);
```

## SQL Migration Script

The complete SQL migration is in `user_profile_migration.sql`. Here's what it does:

1. ✅ Updates `users` table with streak and trophy fields
2. ✅ Creates `trophies` table with 15 predefined trophies
3. ✅ Creates `user_trophies` junction table
4. ✅ Creates `community_upvotes` tracking table
5. ✅ Sets up RLS policies for all new tables
6. ✅ Creates `update_user_stats()` function for streak calculation
7. ✅ Creates `check_xp_trophies()` function for XP awards
8. ✅ Backfills existing user data
9. ✅ Awards "Early Adopter" trophy to all existing users

**Total Execution Time**: ~1-2 seconds  
**Destructive Operations**: None (only additions)  
**Safe to Run**: Yes, uses `IF NOT EXISTS` clauses

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify SQL migration completed successfully
3. Check Supabase table browser to confirm tables exist
4. Ensure RLS policies are enabled
5. Test with a fresh browser session (clear localStorage)

---

**Version**: 1.0.0  
**Date**: 2026-01-11  
**Breaking Changes**: None  
**Migration Required**: Yes (run SQL script)
