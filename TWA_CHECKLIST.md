# TWA Fix Checklist ✅

## 📋 Pre-Flight Check

### Files You Need
- [ ] `signing-key-info.txt` (from Google Play package)
- [ ] `signing.keystore` (from Google Play package)
- [ ] Access to PWABuilder.com
- [ ] Access to Vercel deployment

---

## 🔧 Fix Steps

### 1. Update assetlinks.json
- [ ] Open `signing-key-info.txt`
- [ ] Copy SHA-256 fingerprint
- [ ] Open `public/.well-known/assetlinks.json`
- [ ] Replace placeholder with your SHA-256
- [ ] Verify package name: `online.aarx.hostelledger.twa`
- [ ] Save file

### 2. Deploy to Production
- [ ] Run: `npm run build`
- [ ] Run: `vercel --prod`
- [ ] Wait for deployment to complete
- [ ] Note deployment URL

### 3. Verify assetlinks.json
- [ ] Open: `https://app.hostelledger.aarx.online/.well-known/assetlinks.json`
- [ ] Verify it shows JSON (not 404)
- [ ] Verify it shows your SHA-256
- [ ] Verify package name is correct
- [ ] No redirects or errors

### 4. Rebuild APK
- [ ] Go to PWABuilder.com
- [ ] Enter: `https://app.hostelledger.aarx.online`
- [ ] Click "Build My PWA"
- [ ] Select Android platform
- [ ] Set App URL: `https://app.hostelledger.aarx.online`
- [ ] Set Package: `online.aarx.hostelledger.twa`
- [ ] Enable TWA mode
- [ ] Upload `signing.keystore`
- [ ] Enter keystore password
- [ ] Download new APK and AAB

### 5. Clean Install on Android
- [ ] Uninstall old Hostel Ledger app
- [ ] Open Settings → Apps → Chrome
- [ ] Clear Chrome cache
- [ ] Clear Chrome defaults
- [ ] Transfer new `Ledger.apk` to phone
- [ ] Install new APK
- [ ] Grant permissions if asked

### 6. Test TWA Mode
- [ ] Open Hostel Ledger app
- [ ] Verify: No address bar ✅
- [ ] Verify: No share icon ✅
- [ ] Verify: No browser UI ✅
- [ ] Verify: Full screen ✅
- [ ] Check Recent Apps - shows "Hostel Ledger" ✅
- [ ] Test navigation - stays in app ✅
- [ ] Test offline mode - works ✅

---

## 🎯 Success Criteria

### Visual Check
```
Before Fix:
┌─────────────────────────────────┐
│ ← hostel-ledger.vercel.app  ⋮ │ ← Address bar (BAD)
├─────────────────────────────────┤
│                                 │
│     HOSTEL LEDGER               │
│                                 │
└─────────────────────────────────┘

After Fix:
┌─────────────────────────────────┐
│     HOSTEL LEDGER               │ ← No address bar (GOOD)
│                                 │
│     Full screen app             │
│                                 │
└─────────────────────────────────┘
```

### Technical Check
- [ ] `adb logcat | grep TWA` shows no errors
- [ ] Digital Asset Links verified
- [ ] Package name matches
- [ ] SHA-256 matches
- [ ] Domain matches

---

## 🚨 Troubleshooting

### If still shows browser UI:

#### Check 1: assetlinks.json
```bash
curl https://app.hostelledger.aarx.online/.well-known/assetlinks.json
```
Should return JSON, not 404.

#### Check 2: SHA-256 Match
Compare:
- `signing-key-info.txt` SHA-256
- `assetlinks.json` SHA-256
Must be **exactly** the same.

#### Check 3: Package Name
Must be: `online.aarx.hostelledger.twa`
Not: `app.vercel.hostel_ledger.twa`

#### Check 4: Domain
Must use: `app.hostelledger.aarx.online`
Not: `vercel.app` or preview URLs

#### Check 5: Clear Everything
```bash
# On Android
Settings → Apps → Hostel Ledger → Uninstall
Settings → Apps → Chrome → Storage → Clear all data
Restart phone
Install new APK
```

---

## 📱 Play Store Submission

### After TWA is Working:
- [ ] Test app thoroughly
- [ ] Verify all features work
- [ ] Test offline mode
- [ ] Test push notifications
- [ ] Prepare store listing
- [ ] Upload `Ledger.aab` (not APK)
- [ ] Fill app details
- [ ] Add screenshots
- [ ] Submit for review

---

## ✨ Final Verification

### App Behavior:
- [ ] Opens instantly (no browser loading)
- [ ] Stays in app when navigating
- [ ] Back button works correctly
- [ ] Appears in Recent Apps as "Hostel Ledger"
- [ ] Splash screen shows on launch
- [ ] Status bar matches app theme
- [ ] No browser UI anywhere
- [ ] Offline mode works
- [ ] Push notifications work

### Technical Verification:
```bash
# Check Digital Asset Links
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.hostelledger.aarx.online&relation=delegate_permission/common.handle_all_urls"
```

Should return your assetlinks.json content.

---

## 🎊 Success!

When all checkboxes are ✅:
- Your app opens as a real Android app
- No browser UI visible
- Ready for Play Store
- Professional user experience

**Congratulations! Your PWA is now a proper Android app!** 🚀
