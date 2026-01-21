# TWA (Trusted Web Activity) Fix Guide 🔧

## 🎯 Problem Identified

Your APK opens with browser UI (address bar, share icon) instead of full-screen app mode because:
- ❌ APK is bound to `vercel.app` domain
- ❌ You're using `app.hostelledger.aarx.online`
- ❌ Digital Asset Links not verified
- ❌ Android doesn't trust the connection

## ✅ Complete Fix (Step-by-Step)

### Step 1: Get Your SHA-256 Fingerprint

Open your `signing-key-info.txt` file from the Google Play package and find:
```
SHA-256: AA:BB:CC:DD:EE:FF:...
Package name: app.vercel.hostel_ledger.twa
```

Copy the **SHA-256** value (the long string with colons).

---

### Step 2: Update assetlinks.json

1. Open `public/.well-known/assetlinks.json`
2. Replace `REPLACE_WITH_YOUR_SHA256_FROM_SIGNING_KEY_INFO_TXT` with your actual SHA-256
3. Update package name to: `online.aarx.hostelledger.twa`

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

### Step 3: Deploy assetlinks.json

Build and deploy your app:
```bash
npm run build
vercel --prod
```

**Verify it's accessible:**
```
https://app.hostelledger.aarx.online/.well-known/assetlinks.json
```

Must:
- ✅ Open directly (no redirect)
- ✅ Show JSON content
- ✅ Return `Content-Type: application/json`
- ❌ No 404 error
- ❌ No HTML page

---

### Step 4: Rebuild APK with Correct Domain

Go to **PWABuilder** (https://www.pwabuilder.com):

1. **Enter URL:**
   ```
   https://app.hostelledger.aarx.online
   ```
   ⚠️ **NOT** `vercel.app` or preview URLs!

2. **Click "Build My PWA"**

3. **Select Android Platform**

4. **Configure Settings:**
   - **App URL:** `https://app.hostelledger.aarx.online`
   - **Package Name:** `online.aarx.hostelledger.twa`
   - **App Name:** `Hostel Ledger`
   - **Display Mode:** `standalone`
   - **TWA Mode:** ✅ Enabled

5. **Upload Signing Key:**
   - Click "Use existing signing key"
   - Upload your `signing.keystore` file
   - Enter keystore password
   - Enter key alias
   - Enter key password

6. **Generate Package**

7. **Download:**
   - `Ledger.aab` (for Play Store)
   - `Ledger.apk` (for testing)
   - New `assetlinks.json` (verify it matches yours)

---

### Step 5: Verify assetlinks.json Match

Compare the downloaded `assetlinks.json` with your deployed one:

**They MUST match exactly:**
- Same package name
- Same SHA-256 fingerprint
- Same format

If different, use the one from PWABuilder and redeploy.

---

### Step 6: Test on Android

1. **Uninstall old app:**
   ```
   Settings → Apps → Hostel Ledger → Uninstall
   ```

2. **Clear Chrome cache:**
   ```
   Settings → Apps → Chrome → Storage → Clear cache
   Settings → Apps → Chrome → Open by default → Clear defaults
   ```

3. **Install new APK:**
   - Transfer `Ledger.apk` to phone
   - Install it
   - Open app

4. **Verify TWA mode:**
   - ✅ No address bar
   - ✅ No share icon
   - ✅ No browser UI
   - ✅ Full screen
   - ✅ Shows in Recent Apps as "Hostel Ledger"

---

### Step 7: Verify Digital Asset Links

Use Google's verification tool:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.hostelledger.aarx.online&relation=delegate_permission/common.handle_all_urls
```

Should return your assetlinks.json content.

---

## 🔧 Troubleshooting

### Issue: Still opens in browser mode

**Check:**
1. assetlinks.json is accessible at correct URL
2. SHA-256 matches exactly (including colons)
3. Package name matches exactly
4. No typos in domain name
5. Using production domain (not preview)

**Fix:**
```bash
# Clear Android cache
adb shell pm clear com.android.chrome
adb shell pm clear online.aarx.hostelledger.twa

# Reinstall
adb install -r Ledger.apk
```

---

### Issue: assetlinks.json returns 404

**Check Vercel configuration:**

Create `vercel.json` in project root:
```json
{
  "headers": [
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

Redeploy:
```bash
vercel --prod
```

---

### Issue: Wrong package name in APK

**You need to rebuild with correct package name:**

Package name format: `online.aarx.hostelledger.twa`
- Reverse domain: `online.aarx`
- App name: `hostelledger`
- Suffix: `.twa`

---

### Issue: SHA-256 doesn't match

**Get correct SHA-256:**

From keystore:
```bash
keytool -list -v -keystore signing.keystore -alias key0
```

Look for:
```
Certificate fingerprints:
SHA256: AA:BB:CC:DD:...
```

Update assetlinks.json with this exact value.

---

## 📱 What Success Looks Like

### Before Fix (Browser Mode):
- ❌ Address bar visible
- ❌ Share icon in header
- ❌ Browser UI elements
- ❌ Opens in Chrome tab
- ❌ Shows domain in URL bar

### After Fix (TWA Mode):
- ✅ Full screen app
- ✅ No address bar
- ✅ No browser UI
- ✅ Native app experience
- ✅ Shows in Recent Apps
- ✅ Splash screen on launch
- ✅ Status bar matches theme

---

## 🚀 Deploy to Play Store

Once TWA is working:

1. **Upload AAB file:**
   - Use `Ledger.aab` (not APK)
   - APK is only for testing

2. **Play Store Console:**
   - Create new app
   - Upload `Ledger.aab`
   - Fill app details
   - Submit for review

3. **Verify in Play Store:**
   - App opens in TWA mode
   - No browser UI
   - Full screen experience

---

## 📋 Checklist

Before rebuilding APK:
- [ ] assetlinks.json created in `public/.well-known/`
- [ ] SHA-256 fingerprint added
- [ ] Package name: `online.aarx.hostelledger.twa`
- [ ] Deployed to production
- [ ] Accessible at `https://app.hostelledger.aarx.online/.well-known/assetlinks.json`
- [ ] Returns JSON (not HTML)
- [ ] No 404 error

When rebuilding in PWABuilder:
- [ ] URL: `https://app.hostelledger.aarx.online`
- [ ] Package name matches assetlinks.json
- [ ] Using existing signing.keystore
- [ ] TWA mode enabled
- [ ] Display mode: standalone

After installing APK:
- [ ] Old app uninstalled
- [ ] Chrome cache cleared
- [ ] New APK installed
- [ ] Opens in full screen
- [ ] No browser UI visible

---

## 🎯 Quick Fix Summary

1. Get SHA-256 from `signing-key-info.txt`
2. Update `public/.well-known/assetlinks.json`
3. Deploy: `npm run build && vercel --prod`
4. Verify: `https://app.hostelledger.aarx.online/.well-known/assetlinks.json`
5. Rebuild APK in PWABuilder with correct domain
6. Uninstall old app + clear Chrome cache
7. Install new APK
8. Open app → should be full screen!

---

## 📞 Need Help?

If still not working, check:
1. Browser console for errors
2. Android logcat: `adb logcat | grep -i twa`
3. Digital Asset Links verification tool
4. Ensure HTTPS (not HTTP)
5. No redirects on assetlinks.json URL

---

## ✨ Expected Result

After following this guide:
- ✅ App opens in full screen
- ✅ No browser UI
- ✅ Real Android app experience
- ✅ Ready for Play Store submission
- ✅ TWA verified by Android

Your Hostel Ledger will be a **real Android app**, not a website! 🎉
