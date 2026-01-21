# Fix TWA Issue - Quick Action Guide ⚡

## 🎯 Your Problem
App opens with browser UI (address bar, share icon) instead of full-screen app.

## ✅ Quick Fix (5 Steps)

### Step 1: Get SHA-256 from Your Files
Open `signing-key-info.txt` from your Google Play package folder.

Find this line:
```
SHA-256: AA:BB:CC:DD:EE:FF:11:22:33:44:...
```

**Copy the entire SHA-256 value** (with colons).

---

### Step 2: Update assetlinks.json

1. Open: `public/.well-known/assetlinks.json`
2. Replace `REPLACE_WITH_YOUR_SHA256_FROM_SIGNING_KEY_INFO_TXT` with your SHA-256
3. Save file

**Example:**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "online.aarx.hostelledger.twa",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E3:6D:3A:AE:4A:65:5C:4B:8B:9D:71:E1"
      ]
    }
  }
]
```

---

### Step 3: Deploy to Vercel

```bash
npm run build
vercel --prod
```

**Test URL (must work):**
```
https://app.hostelledger.aarx.online/.well-known/assetlinks.json
```

Open in browser - should show JSON, not 404.

---

### Step 4: Rebuild APK in PWABuilder

1. Go to: https://www.pwabuilder.com
2. Enter: `https://app.hostelledger.aarx.online`
3. Click "Build My PWA"
4. Select "Android"
5. **Important Settings:**
   - App URL: `https://app.hostelledger.aarx.online`
   - Package Name: `online.aarx.hostelledger.twa`
   - Display: `standalone`
   - TWA: ✅ Enabled
6. Upload your `signing.keystore`
7. Download new `Ledger.apk`

---

### Step 5: Install on Android

1. **Uninstall old app**
2. **Clear Chrome:**
   - Settings → Apps → Chrome → Storage → Clear cache
   - Settings → Apps → Chrome → Open by default → Clear defaults
3. **Install new APK**
4. **Open app**

**Should now see:**
- ✅ Full screen
- ✅ No address bar
- ✅ No share icon
- ✅ Real app experience

---

## 🔍 Verify It's Working

### Before Fix:
```
❌ hostel-ledger.vercel.app (in address bar)
❌ Share icon visible
❌ Browser UI
```

### After Fix:
```
✅ Full screen
✅ No browser UI
✅ Shows "Hostel Ledger" in Recent Apps
✅ Native app experience
```

---

## 📋 Quick Checklist

- [ ] Got SHA-256 from signing-key-info.txt
- [ ] Updated public/.well-known/assetlinks.json
- [ ] Deployed to Vercel
- [ ] Verified assetlinks.json is accessible
- [ ] Rebuilt APK with correct domain in PWABuilder
- [ ] Uninstalled old app
- [ ] Cleared Chrome cache
- [ ] Installed new APK
- [ ] App opens full screen!

---

## 🚨 Common Mistakes

### ❌ Wrong Domain
```
Bad:  hostel-ledger.vercel.app
Good: app.hostelledger.aarx.online
```

### ❌ Wrong Package Name
```
Bad:  app.vercel.hostel_ledger.twa
Good: online.aarx.hostelledger.twa
```

### ❌ SHA-256 Mismatch
- Must match exactly from signing-key-info.txt
- Include all colons
- No spaces

### ❌ assetlinks.json Not Accessible
- Must be at: `/.well-known/assetlinks.json`
- Must return JSON (not HTML)
- Must not redirect
- Must not 404

---

## 🎯 Expected Timeline

- Step 1-2: 2 minutes (update file)
- Step 3: 3 minutes (deploy)
- Step 4: 5 minutes (rebuild APK)
- Step 5: 2 minutes (install)

**Total: ~12 minutes to fix!**

---

## ✨ Success!

After following these steps, your Hostel Ledger will open as a **real Android app** without any browser UI! 🎉

Ready for Play Store submission with `Ledger.aab` file.
