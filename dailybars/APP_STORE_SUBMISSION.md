# 📱 DAILY RAPS - APP STORE SUBMISSION GUIDE
## GUAPDAD 4000 EDITION

> Complete guide to shipping Daily Raps to the Apple App Store

---

## 🚀 QUICK START (TL;DR)

```bash
# 1. Install dependencies
npm install

# 2. Add iOS platform
npx cap add ios

# 3. Sync web files
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. Build & Submit in Xcode
# See detailed steps below
```

---

## 📋 PRE-SUBMISSION CHECKLIST

### ✅ Apple Developer Account
- [ ] Active Apple Developer Program membership ($99/year)
- [ ] Sign up at: https://developer.apple.com/programs/
- [ ] Create App Store Connect account
- [ ] Set up certificates and provisioning profiles

### ✅ App Assets Required
- [x] App Icon 1024x1024 (icon-1024.png) - **GENERATE THIS**
- [x] PWA icons (32, 48, 72, 180, 192, 512) - ✅ Already have
- [ ] Screenshots (required sizes below)
- [ ] App Preview videos (optional but recommended)

### ✅ App Store Connect Setup
- [ ] Create new app in App Store Connect
- [ ] Bundle ID: `com.guapdad4000.dailyraps`
- [ ] SKU: `dailyraps-001`
- [ ] Primary Language: English (U.S.)

---

## 📱 REQUIRED SCREENSHOTS

### iPhone Screenshots (Required)
| Device | Size | Required |
|--------|------|----------|
| iPhone 6.9" (16 Pro Max) | 1320 x 2868 | Yes |
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1284 x 2778 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Yes |

### iPad Screenshots (If supporting iPad)
| Device | Size | Required |
|--------|------|----------|
| iPad Pro 12.9" | 2048 x 2732 | Optional |
| iPad Pro 11" | 1668 x 2388 | Optional |

### Screenshot Tips
1. Take screenshots of key features:
   - Feed view with bars
   - Writing/recording interface
   - Archive grid view
   - Crates (songs) view
   - Daily Deposit feature
   - The Syndicate community
2. Add marketing text overlays
3. Keep brand consistent (black/white/yellow)

---

## 📝 APP STORE METADATA

### App Name
```
Daily Raps - Write Bars Daily
```

### Subtitle (30 chars max)
```
Songwriting for Creatives
```

### Promotional Text (170 chars max)
```
Write bars every day. Build your catalog. Join the syndicate. Oakland energy meets brutalist design in the ultimate lyric writing app.
```

### Description (4000 chars max)
```
DAILY RAPS - GUAPDAD 4000 EDITION

Write bars daily. Stay creative. The ultimate mobile experience for songwriters, rappers, and lyricists.

▸ WRITE & RECORD
Drop bars anytime with our quick-input system. Record voice memos when inspiration hits. Your ideas, captured instantly.

▸ ORGANIZE YOUR CATALOG
- Feed: Your latest ideas at a glance
- Archive: Visual grid of all your bars
- Favorites: Quick access to your best work
- Crates: Build full songs from your bars

▸ DAILY DEPOSIT
Never face writer's block again. Get hyper-specific prompts mixing feelings, settings, objects, and vocabulary challenges. Every day is a new creative seed.

▸ THE SYNDICATE
Join the community. Submit prompts. See what other creatives are cooking. The digital cypher that never stops.

▸ STUDIO FEATURES
- Voice memo recording (30-sec clips)
- Beat Locker for writing to instrumentals
- Rhyme Connect (double-tap for rhymes)
- POST THAT social export

▸ UNIQUE DESIGN
Brutalist aesthetic meets Oakland energy. Paper textures, editorial typography, and that signature golden yellow accent.

Built for creators, by creators. Oakland, CA.

© GUAPDAD 4000
```

### Keywords (100 chars max, comma-separated)
```
lyrics,songwriting,rap,hip-hop,bars,music,creative,rhymes,beats,recording,poetry,writing
```

### Support URL
```
https://github.com/guapdad4000/dailybars/issues
```

### Marketing URL
```
https://dailyraps.app
```

### Privacy Policy URL
```
https://dailyraps.app/privacy
```

---

## 🎨 GENERATING THE 1024x1024 APP ICON

Your existing `icon-512.png` needs to be scaled up or recreated at 1024x1024.

### Option 1: Use Existing Icon (Upscale)
If your 512 icon is vector-based or high quality:
```bash
# Using ImageMagick
convert images/icon-512.png -resize 1024x1024 images/icon-1024.png

# Using sips (macOS built-in)
sips -z 1024 1024 images/icon-512.png --out images/icon-1024.png
```

### Option 2: Create Fresh (Recommended)
Re-export from your original design file at 1024x1024.

### Icon Requirements
- 1024 x 1024 pixels
- PNG format
- No transparency
- No rounded corners (iOS adds them)
- sRGB color space

---

## 🔧 BUILD STEPS (DETAILED)

### Step 1: Setup Environment
```bash
# Ensure you have Node.js 18+ and npm
node -v
npm -v

# Install Xcode from Mac App Store
# Open Xcode and install Command Line Tools

# Install CocoaPods
sudo gem install cocoapods
```

### Step 2: Initialize Capacitor
```bash
cd /path/to/dailybars

# Install npm dependencies
npm install

# Add iOS platform
npx cap add ios

# Sync your web files to iOS
npx cap sync ios
```

### Step 3: Configure iOS Project
```bash
# Open Xcode project
npx cap open ios
```

In Xcode:
1. Select "App" target
2. Go to "Signing & Capabilities"
3. Select your Team (Apple Developer account)
4. Set Bundle Identifier: `com.guapdad4000.dailyraps`
5. Check "Automatically manage signing"

### Step 4: Add App Icons in Xcode
1. In Xcode, open `App/Assets.xcassets`
2. Select `AppIcon`
3. Drag your 1024x1024 icon to the slot
4. Xcode will generate all required sizes

### Step 5: Configure Info.plist
Add these to `ios/App/App/Info.plist`:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
<key>NSMicrophoneUsageDescription</key>
<string>Daily Raps needs microphone access to record voice memos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Daily Raps needs photo access to add images to your bars</string>
```

### Step 6: Build for App Store
1. In Xcode: Product → Archive
2. Wait for archive to complete
3. Window → Organizer
4. Select your archive → Distribute App
5. Choose "App Store Connect"
6. Follow the prompts to upload

### Step 7: Submit in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Create new version (3.0.0)
4. Fill in all metadata
5. Upload screenshots
6. Submit for review

---

## 🔒 APP REVIEW GUIDELINES

### Common Rejection Reasons & Fixes

1. **Incomplete Information**
   - Ensure all metadata fields are filled
   - Include demo login if app requires auth
   
2. **Crashes or Bugs**
   - Test thoroughly on real device
   - Check all features work offline
   
3. **Privacy Policy**
   - Must have accessible privacy policy
   - Explain data collection clearly
   
4. **Login Issues**
   - Provide demo credentials:
     - Email: `demo@dailyraps.app`
     - Password: `demo123`

### Demo Account Setup
Create a demo account for App Review:
```
Username: reviewer
Email: demo@dailyraps.app
Password: AppReview2024!
```

---

## 📊 VERSION INFO

| Field | Value |
|-------|-------|
| Version | 3.0.0 |
| Build | 1 |
| Bundle ID | com.guapdad4000.dailyraps |
| Min iOS | 14.0 |
| Devices | iPhone, iPad |

---

## 🚨 IMPORTANT REMINDERS

1. **Test on Real Device** - Simulator isn't enough
2. **Check Network Calls** - Ensure Supabase works in native wrapper
3. **Audio Permissions** - Voice memo needs microphone access
4. **Offline Support** - Service worker should work within Capacitor
5. **Safe Areas** - Already handled with `viewport-fit=cover`

---

## 📞 SUPPORT

- GitHub Issues: https://github.com/guapdad4000/dailybars/issues
- Email: support@dailyraps.app

---

*DAILY RAPS © 2024 | GUAPDAD 4000 EDITION | OAKLAND, CA*
