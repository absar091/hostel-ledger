# Bubblewrap Android App Setup Guide

This guide will help you convert your Hostel Ledger PWA into an Android APK using Google's Bubblewrap CLI.

## Prerequisites Checklist

- [x] PWA is configured and deployed (✓ Your app is ready)
- [x] Manifest file is accessible at: https://app.hostelledger.aarx.online/manifest.webmanifest
- [ ] Node.js installed (v16 or higher)
- [ ] Java Development Kit (JDK 17) - Bubblewrap can install this
- [ ] Android SDK - Bubblewrap can install this

## Step 1: Prepare Your Icons

You need proper icon sizes for Android. Let me check your current icons:

### Required Icon Sizes:
- 192x192 pixels (for app icon)
- 512x512 pixels (for splash screen)

Your current `only-logo.png` is 707x701 pixels. You'll need to create proper sized versions.

### Generate Icons:
1. Visit: https://realfavicongenerator.net/
2. Upload your `only-logo.png`
3. Download the generated icons
4. Place `web-app-manifest-192x192.png` and `web-app-manifest-512x512.png` in the `public` folder

## Step 2: Update Your Manifest for TWA

Your manifest needs a `startUrl` with a query parameter to detect TWA mode.


## Step 3: Create Android Build Folder

```bash
# Create a dedicated folder for Android build
mkdir android
cd android
```

## Step 4: Install Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
```

## Step 5: Initialize Bubblewrap Project

Run this command from inside the `android` folder:

```bash
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest
```

### What Happens During Init:

1. **JDK Setup**: Bubblewrap will ask to install JDK 17
   - If automatic installation fails, install manually from: https://adoptium.net/
   - Then provide the path when prompted

2. **Android SDK Setup**: Bubblewrap will ask to install Android SDK
   - Let Bubblewrap handle this (recommended)
   - Or install Android Studio and provide SDK path

### Answer These Questions:

```
Domain: [Press Enter - auto-filled]
Application name: Hostel Ledger
Application ID: online.aarx.hostelledger.twa
Display mode: standalone
Orientation: portrait
Status bar color: #4a6850
Splash screen color: #F8F9FA
Icon URL: [Press Enter - auto-filled]
Include support for Play Billing?: N
Request geolocation permission?: N
```

### Keystore Configuration:

```
First and Last names: [Your Full Name]
Organizational Unit: Developer
Organization: AARX
Country (2-letter code): [Your Country Code, e.g., US, IN]
Password for key store: [Create a strong password]
Password for key: [Use the SAME password as above]
```

**IMPORTANT**: Both passwords MUST be identical or the build will fail!

## Step 6: Build Your APK

```bash
bubblewrap build --universalApk
```

This creates both `.apk` (for testing) and `.aab` (for Play Store) files.

### Build Output Location:
```
android/
├── app-release-bundle.aab  (for Play Store)
└── app-release-universal.apk  (for testing)
```

## Step 7: Set Up TWA Validation (Digital Asset Links)

This is crucial for removing the browser address bar!

### 7.1: Get Your SHA256 Fingerprint

From the `android` folder, run:

```bash
keytool -list -v -keystore android.keystore -alias android
```

Enter your keystore password, then copy the SHA256 fingerprint.

### 7.2: Update assetlinks.json

Your file at `public/.well-known/assetlinks.json` needs the SHA256 fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "online.aarx.hostelledger.twa",
      "sha256_cert_fingerprints": [
        "PASTE_YOUR_SHA256_HERE"
      ]
    }
  }
]
```

### 7.3: Deploy and Verify

1. Deploy your updated `assetlinks.json` to production
2. Verify at: https://developers.google.com/digital-asset-links/tools/generator
   - Site: `app.hostelledger.aarx.online`
   - Package: `online.aarx.hostelledger.twa`
   - Fingerprint: [Your SHA256]

## Step 8: Test Your APK

1. Transfer `app-release-universal.apk` to your Android phone
2. Enable "Install from Unknown Sources" in Settings
3. Install and open the app
4. If TWA validation is correct, you won't see the browser address bar!

## Step 9: Optional - Detect TWA Mode in Your App

To show different content in the app vs website:

### 9.1: Update twa-manifest.json

In `android/twa-manifest.json`, add or update:

```json
{
  "startUrl": "/?twa=true"
}
```

### 9.2: Rebuild

```bash
bubblewrap build --universalApk
```

### 9.3: Detect TWA in Your React App

I'll create a hook for this in the next step.

## Troubleshooting

### JDK Installation Fails
- Download manually from: https://adoptium.net/
- Install and provide path: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`

### Android SDK Issues
- Let Bubblewrap install it automatically
- Or install Android Studio and use its SDK

### Build Fails with Password Error
- Ensure keystore password and key password are IDENTICAL

### Address Bar Still Shows
- Verify assetlinks.json is accessible at: `https://app.hostelledger.aarx.online/.well-known/assetlinks.json`
- Check SHA256 fingerprint matches exactly
- Wait 24-48 hours for Google to cache the validation

### Icon Size Errors
- Ensure you have proper 192x192 and 512x512 PNG files
- Update manifest to reference correct icon files

## Publishing to Google Play Store

1. Create a Google Play Developer account ($25 one-time fee)
2. Upload the `.aab` file (not the `.apk`)
3. Fill in store listing details
4. Submit for review

## Updating Your App

When you make changes:

1. Update your website and deploy
2. In the `android` folder, run:
   ```bash
   bubblewrap update
   bubblewrap build --universalApk
   ```
3. Increment version in `twa-manifest.json` before building

## Important Files

- `android/twa-manifest.json` - App configuration
- `android/android.keystore` - **BACKUP THIS FILE!** You need it for all future updates
- `public/.well-known/assetlinks.json` - TWA validation

## Next Steps

1. Create proper icon sizes (192x192, 512x512)
2. Update manifest to use new icons
3. Build and deploy your website
4. Follow steps 3-8 above
5. Test on Android device
6. Publish to Play Store!
