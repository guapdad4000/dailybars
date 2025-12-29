# PHASE 3: THE SYNDICATE & STUDENT ARCHITECTURE
**Implementation Plan for Daily Bars**

## 1. UI/UX Polish & Quick Wins (Immediate)
*Goal: Fix visual glitches and improve basic usability.*

### A. Feed Experience
- **Fix: Edit Box Shortening**
  - **Issue**: Textarea collapses when editing long bars.
  - **Solution**: Implement auto-expanding textarea logic (`height: auto; height: scrollHeight`) in `IdeaCard`.
- **Fix: Feed Card Padding**
  - **Issue**: Too much whitespace between content, divider, and actions.
  - **Solution**: Tighten CSS margins/padding in `IdeaCard` container and action bar.
- **Fix: Train Nav Animation**
  - **Issue**: Train animation resets to first stop on every page load/change.
  - **Solution**: Persist "current stop" state in `App` component and pass it to the Nav component so the train stays at the correct station (Feed, Vault, Crates, etc.).

### B. Sharing & Export
- **Fix: Share with Pictures**
  - **Issue**: `html2canvas` often fails with cross-origin images.
  - **Solution**: Ensure all images (uploaded/linked) have `crossOrigin="anonymous"` and use a proxy or base64 conversion before rendering the canvas.
- **New: Export Archive Options**
  - **Feature**: Save bars as readable text.
  - **Implementation**: Add "Export Options" button in Settings:
    - `.txt`: Plain text dump of all bars.
    - `.pdf`: Styled document (using `jspdf`) that looks like the "Newspaper" export.

## 2. Workflow Enhancements (The "Crate" Connection)
*Goal: Connect the "Feed" (Brainstorming) to "Crates" (Songwriting).*

- **Feature: Send Bar to Song**
  - **Action**: Add "Add to Crate" button on every Bar card.
  - **UI**: Opens a modal to select an existing Song (or create new).
  - **Logic**: Appends the bar text as a new "Text Block" in the selected Song.

## 3. Vault 2.0 (The Syndicate Vault)
*Goal: Turn the Vault into a two-sided marketplace of ideas.*

### A. Vault Restructure
- **Tab 1: Prompts (The Spark)**
  - Daily Prompts (current functionality).
  - **New**: "Submit a Prompt" form. Users can suggest words, themes, or scenarios.
- **Tab 2: Free Game (The Stash)**
  - Open source verses/bars.
  - **Action**: "Send to Free Game" button on your own bars. Relinquishes ownership (visual disclaimer) and posts it to the public `community_submissions` table.

### B. Submission Logic
- Create form for User Prompt Submission.
- Create logic to move a Bar from local state to public `community_submissions`.

## 4. The Student System (Gamification)
*Goal: Reward consistency and participation.*

### A. XP Architecture
- **XP Sources**:
  - **Writing Daily**: +10 XP (Streak bonus).
  - **Vault Submission**: +50 XP (Approved prompt/verse).
  - **Bar Upvotes**: +5 XP (If social is enabled) or **Self-Review**: +5 XP.
- **Backend**: Add `xp` and `level` columns to `users` table.

### B. The XP Store (The Trophy Room)
- **UI**: A horizontal scroll gallery ("The Shelf").
- **Mechanic**: Items are locked by Level or XP cost.
- **Artifacts (Unlockables)**:
  - Lvl 5: E-40's Glasses (Unlocks "Slang" prompt dictionary).
  - Lvl 10: Slick Rick's Eye Patch (Unlocks "Storytelling" mode theme).
  - Lvl 20: Ghostface's Chain (Unlocks "Golden Era" visual theme).
  - Lvl 50: Kanye's Pink Polo (Unlocks "Soul Chop" beat pack).
- **Implementation**: New `store_items` table and `user_inventory` table.

---

## Execution Order
1. **Group 1 (UI Fixes)** - *Day 1*
2. **Group 2 (Workflow)** - *Day 1-2*
3. **Group 3 (Vault)** - *Day 2-3*
4. **Group 4 (XP System)** - *Day 3-4*
