# DAILY BARS
## GUAPDAD 4000 EDITION

> *A unique mobile experience blending brutalist design with Bay Area flavor*

---

## THE AESTHETIC

A fusion of two worlds:
- **Sound Room Brutalism** - Stark black/white, editorial typography, zine layouts
- **Daily Bars Energy** - Golden yellow accents (#EAB308), Playfair serif headlines, Oakland vibes

The result is something truly unique - underground venue meets music journalism meets high fashion editorial.

---

## 🆕 LATEST UPDATES (v2.7)

### 🔧 DEPLOYMENT SYNC FIX (v2.7)
**UI and Database now stay in sync across all deployments.**

- ✅ **Service Worker v6**: Complete rewrite with aggressive cache busting
- ✅ **Auto-Update**: App automatically refreshes when new version detected
- ✅ **API Bypass**: Database calls NEVER cached - always fresh
- ✅ **Stale-While-Revalidate**: Fast loads + background updates
- ✅ **Debug Mode**: Set `window.DEBUG_API = true` in console to trace issues

**To Force a Complete Refresh:**
1. **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Clear Site Data**: DevTools → Application → Storage → Clear site data
3. **Nuclear Option**: Unregister SW + Clear cache + Refresh

**Debug API Issues:**
```javascript
// In browser console:
window.DEBUG_API = true;
// Then try actions - you'll see all API calls logged
```

---

### 🔄 CACHE FIX (v2.6)
**Syndicate was invisible? Not anymore.**

- ✅ **Service Worker Updated**: Now properly caches `daily-deposit-engine.js`
- ✅ **Cache Version Bumped**: v4 → v5 forces fresh downloads
- ✅ **Seed Data Added**: The Syndicate vault has starter prompts

---

## PREVIOUS UPDATES (v2.5)

### 🎲 THE DAILY DEPOSIT (NEW!)
**The "Mad Libs" Engine for high-end inspiration.**
- **Hyper-Niche Prompts:** Generates specific prompts mixing specific feelings, settings, objects, and smells.
- **Example:** "Write about BETRAYAL set in Lake Merritt at 3 AM. Include: Vintage Fendi Umbrella. Smell: Burnt Rubber."
- **Vocab Challenge:** Forces 3 specific high-level words (e.g., "Opalescent", "Dividends") into the mix.

### 🤝 THE SYNDICATE (COMMUNITY TAB)
**A digital cypher for the community.**
- **Submit Prompts:** Users can drop their own creative seeds into the Vault.
- **Community Feed:** See what other handsome creatives are suggesting.

### 🔐 LOGIN FLEXIBILITY (v2.4)
**Log in your way - email OR username now accepted.**

- ✅ **Username Login**: Sign in with just your artist name (e.g., "guap")
- ✅ **Email Login**: Still works with your email address
- ✅ **Remember Me**: Saves your preferred login method
- ✅ **Seamless Auth**: No more guessing which field to use

**Admin Access** (guapdad@gmail.com):
- Login with: `guap`, `guapdad@gmail.com`, or `guap@dailybars.com`
- All point to the same account

### 📦 DATA MIGRATION (v2.4)
**Lost data recovery for legacy accounts.**

If your data was orphaned due to user ID changes, the system now automatically migrates:
- ✅ Bars from user `e0f2c461-fc65-4d3e-9640-a715e3d1673c` → @guap
- ✅ Songs from user `e0f2c461-fc65-4d3e-9640-a715e3d1673c` → @guap
- ✅ All orphan data (no username) → @guap admin account
- ✅ Migration runs automatically on admin login

---

## 📚 PREVIOUS UPDATES (v2.3)

### 🎲 THE DAILY DROP (NEW!)
**Writer's block is a myth, but sometimes you need a spark.**

An inspiration widget integrated into the header that delivers daily prompts to keep your creative streak burning:

**Features**:
- ✅ **Two-dice icon** (black & white) in header bottom-right corner
- ✅ Daily rotating prompts based on date
- ✅ Multiple prompt types: TOPIC, WORD DROP, FLOW CHECK, MOOD, COLLAB READY, BAY AREA
- ✅ Challenge system (e.g., "Use at least one metaphor")
- ✅ Shuffle button for new inspiration
- ✅ One-tap to load prompt into QuickInput
- ✅ Red notification dot when unused today
- ✅ Subtle bounce animation to catch attention
- ✅ Prompt streak tracking

**Example Prompts**:
- "Spit 8 bars about LOYALTY" (Challenge: Use at least one metaphor)
- "Use the word ALGORITHM" (Challenge: Make it fit naturally in 4 bars)
- "Write DOUBLE TIME bars" (Challenge: Pack syllables per line)
- "Write something NOSTALGIC" (Challenge: Reference childhood memories)

**Location**: Header bottom-right corner (two dice icon - black & white)

---

### 🔧 BUG FIXES (v2.3)
**The machine just got smoother.**

- ✅ **Service Worker Fix**: Resolved `chrome-extension://` scheme errors in cache operations
- ✅ **Data Loading Fix**: Enhanced data loading with better race condition handling
- ✅ **Debug Logging**: Added comprehensive console logging for troubleshooting
- ✅ **Username Filtering**: Case-insensitive username matching for reliability
- ✅ **Orphan Data Detection**: Logs warnings for data without usernames
- ✅ **Cache Version**: Updated to v4 for fresh start

**If you lost entries after refresh**:
1. Open browser console (F12 → Console)
2. Look for `📊 Total bars in DB:` and `⚠️ Found X orphan bars`
3. If orphan data exists, log in as admin to auto-migrate

---

### 🧹 THE CLEAN UP (Code Refactor)
**The engine just got a full tune-up.**

The codebase has been restructured for maintainability and performance:

**Before**: Single `index.html` file (~4,000 lines)
**After**: Clean separation of concerns

```
index.html          (~65 lines)  - Lean entry point
css/style.css       (~400 lines) - All styles
js/app.js           (~1800 lines) - Core utilities & components
js/app-views.js     (~1900 lines) - Views & main app
```

**Benefits**:
- ✅ Faster development iteration
- ✅ Easier debugging
- ✅ Better caching (styles/scripts cache separately)
- ✅ Team-ready architecture
- ✅ Cleaner git diffs

---

### 📱 PWA READY (Progressive Web App)
**Daily Bars is now installable as a native-like app on your iPhone!**

**Features**:
- ✅ Add to home screen - launches like a native app
- ✅ Works offline - cached for fast loading
- ✅ No Safari bars - full screen experience
- ✅ Saves to device - keeps your data local
- ✅ App icon - beautiful icon on home screen
- ✅ Splash screen - smooth startup

**How to Install on iPhone**:
1. Open Safari and go to your Daily Bars URL
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. Done! Launch from home screen like any app

---

### 🚇 NYC Subway Train Navigation
- **Design**: Authentic R-train with stainless steel body, yellow stripe, corrugated panels
- **Animation**: Rocks when typing, glides between stations
- **Stations**: MTA-style circles with letter indicators

---

## 🎙️ STUDIO MODE (Voice Memos)
**Sometimes the flow hits you when you drivin' or in the shower.**

**Features**:
- Record button next to Write button
- 30-second max clips
- Real-time recording timer
- Audio stored as Base64
- Playback on cards with waveform
- Redo/Keep workflow

---

### 🎧 THE BEAT LOCKER (Instrumental Playback)
**Write to the beat. Loop forever.**

**Features**:
- Audio player in TrackEditor header
- Upload local MP3 files
- Paste external audio URLs
- Infinite loop mode
- Purple accent (#7C3AED) when playing

---

### 📸 "POST THAT" (Social Export)
**If you wrote a fire bar but didn't post it on IG Stories, did it even happen?**

**Features**:
- One-click social graphic generation
- Paper texture background
- Daily Bars logo header
- Quote in elegant Playfair Display italic
- @GUAPDAD4000 footer branding
- Downloads as high-quality PNG (2x scale)

---

### 🧠 RHYME CONNECT (Integrated Thesaurus)
**You stuck on a rhyme for "Ferrari"? Don't break focus.**

**Features**:
- Double-tap any word in text area
- Perfect rhymes section
- Near rhymes section (slant rhymes)
- Tap a rhyme to append
- Uses Datamuse API

---

## NAVIGATION

### Swipe to Navigate
No buttons. No tabs. Just swipe left or right to flow between views:

```
← SWIPE →

FEED → ARCHIVE → FAVORITES → CRATES → FEED...
```

### View Indicator (NYC Subway Train Style)
- **Concept**: Authentic NYC R-train moving along tracks
- **Active State**: Silver/grey R-train overlaid on track
- **Active Station**: Deep Red (#DC2626) MTA circle
- **Animation**: Train glides smoothly between stations

---

## VIEWS

### FEED - Your Ideas
Main canvas with alternating image layouts:
- Odd cards: Image on RIGHT
- Even cards: Image on LEFT
- Voice memo playback on cards
- "POST THAT" button for social export

### ARCHIVE - Flyer Grid
Square grid of all your bars with grayscale treatment.

### FAVORITES - Starred
Quick access to your best bars.

### CRATES - Newspaper Stack Edition
Visual stack of "newspapers" representing your tracks:
- Real paper textures (6-frame sprite sheet)
- Mastheads with song titles
- Article snippets from lyrics
- Beat Locker in editor

---

## DATA

### Users Table
```
id, username, email, password (hashed), created_at_custom, last_login, is_verified
```

### Bars Table
```
id, text, tags[], imageUrl, audioUrl, isFavorite, aiGenerated, username
```

### Songs Table
```
id, title, blocks[], status, isFavorite, coverImage, beatUrl, username
```

---

## API

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | /tables/users | List users |
| POST | /tables/users | Create user |
| GET | /tables/bars | List bars |
| POST | /tables/bars | Create bar |
| PATCH | /tables/bars/:id | Update bar |
| DELETE | /tables/bars/:id | Delete bar |
| GET | /tables/songs | List songs |
| POST | /tables/songs | Create song |
| PUT | /tables/songs/:id | Update song |
| DELETE | /tables/songs/:id | Delete song |

### External APIs
- **Datamuse API**: `https://api.datamuse.com/words?rel_rhy={word}` - Rhymes
- **Datamuse API**: `https://api.datamuse.com/words?rel_nry={word}` - Near rhymes
- **Gemini AI**: Content generation for bars

---

## TECH STACK

- React 18 (CDN)
- Lucide Icons
- html2canvas (Social Export)
- IBM Plex Mono + Playfair Display + Archivo Black
- HTML5 MediaRecorder API (Voice Memos)
- HTML5 Audio API (Beat Locker)
- Datamuse API (Rhyme Connect)
- Touch events for swipe
- RESTful API
- **PWA**: Service Worker + Web App Manifest
- **Offline Support**: Cache API for offline functionality

---

## FILE STRUCTURE

```
index.html              (entry point - lean ~65 lines)
manifest.json           (PWA configuration)
service-worker.js       (offline caching v4)
README.md               (this file)
IMPROVEMENTS.md         (future roadmap)
PHASE_2.md              (development notes)
PWA-INSTALL-GUIDE.md    (installation docs)
PWA-SETUP-COMPLETE.md   (setup docs)
generate-icons.html     (icon generator utility)

css/
  └── style.css         (all styles ~400 lines)

js/
  ├── app.js           (core utilities & components ~1800 lines)
  └── app-views.js     (views & main app ~1900 lines)

images/
  ├── icon-192.png              (PWA icon - small)
  ├── icon-512.png              (PWA icon - large)
  ├── newspaper-sprites.png     (6-frame paper textures)
  ├── paper-texture.jpg         (legacy texture)
  └── smooth-paper-texture.jpg  (main texture)
```

---

## COLORS

| Name | Hex | Usage |
|------|-----|-------|
| Black | #000000 | Primary, borders |
| White | #FFFFFF | Cards, backgrounds |
| Paper | #F4F4F0 | App background |
| Electric | #EAB308 | Accents, highlights |
| Feed Green | #166534 | Feed Tab |
| Archive Brown | #4A2C2A | Archive Tab |
| Crates Blue | #1E3A8A | Crates Tab |
| Beat Purple | #7C3AED | Beat Locker |
| Recording Red | #EF4444 | Voice Memo |

---

## ENTRY POINTS

| Path | Description |
|------|-------------|
| `/` | Main app (index.html) |
| `/manifest.json` | PWA configuration |
| `/service-worker.js` | Offline cache worker |
| `/css/style.css` | Main stylesheet |
| `/js/app.js` | Core application |
| `/js/app-views.js` | Views & main app |
| `/tables/bars` | Bars API endpoint |
| `/tables/songs` | Songs API endpoint |
| `/tables/users` | Users API endpoint |

---

## 📱 INSTALLATION (PWA)

### iPhone / iPad (Safari)
1. Open the app in Safari
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Launch from home screen!

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Tap "Add to Home screen"
4. Tap "Add"
5. Launch from home screen!

### Desktop (Chrome/Edge)
1. Look for the install icon (➕) in address bar
2. Click "Install"
3. App opens in its own window!

---

## NEXT STEPS

- [x] PWA support (installable app)
- [x] Daily Drop inspiration widget
- [x] Code refactor (CSS/JS separation)
- [ ] Cloud audio storage (reduce Base64 size)
- [ ] BPM detection for Beat Locker
- [ ] Auto-transcription for voice memos
- [ ] Share directly to IG/X from POST THAT
- [ ] Collaborative tracks (multi-user songs)
- [ ] Full native iOS app (Capacitor wrapper)

---

*DAILY BARS © 2024*
*GUAPDAD 4000 EDITION*
*OAKLAND, CA*
