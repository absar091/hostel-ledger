# Android APK Build Checklist

Use this checklist to track your progress in converting Hostel Ledger to an Android app.

## Pre-Build Checklist

- [ ] **PWA is deployed and accessible**
  - URL: https://app.hostelledger.aarx.online
  - Manifest accessible at: /manifest.webmanifest
  
- [ ] **Icons are ready**
  - [ ] 192x192 PNG icon created
  - [ ] 512x512 PNG icon created
  - [ ] Icons placed in `public` folder
  - [ ] Manifest updated to reference new icons

- [ ] **Manifest is configured**
  - [x] `id` field added
  - [x] `prefer_related_applications` set to false
  - [x] `start_url` set to `/?twa=true`
  - [x] Icon sizes match actual dimensions
  - [x] Theme colors set
  - [x] Display mode is "standalone"

- [ ] **assetlinks.json is ready**
  - [x] File exists at `public/.well-known/assetlinks.json`
  - [ ] SHA256 fingerprint will be added after keystore creation
  - [ ] Package name is correct: `online.aarx.hostelledger.twa`

## Build Environment Setup

- [ ] **Node.js installed**
  - Version 16 or higher
  - Check: `node --version`

- [ ] **Bubblewrap CLI installed**
  - Run: `npm install -g @bubblewrap/cli`
  - Check: `bubblewrap --version`

- [ ] **JDK 17 installed**
  - Let Bubblewrap install it, OR
  - Download from: https://adoptium.net/
  - Check: `java --version`

- [ ] **Android SDK installed**
  - Let Bubblewrap install it (recommended), OR
  - Install Android Studio

## Build Process

- [ ] **Create android folder**
  - Run: `setup-android-build.bat` OR
  - Manually: `mkdir android`

- [ ] **Initialize Bubblewrap**
  - Navigate to `android` folder
  - Run: `bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest`
  
- [ ] **Answer Bubblewrap questions**
  - Application name: Hostel Ledger
  - Application ID: online.aarx.hostelledger.twa
  - Display mode: standalone
  - Orientation: portrait
  - Status bar color: #4a6850
  - Splash screen color: #F8F9FA
  - Play Billing: N
  - Geolocation: N

- [ ] **Create keystore**
  - First and Last names: [Your Name]
  - Organizational Unit: Developer
  - Organization: AARX
  - Country: [Your Country Code]
  - Password: [Same for both keystore and key]
  - **IMPORTANT**: Save this password securely!

- [ ] **Build APK**
  - Run: `bubblewrap build --universalApk`
  - Wait for build to complete
  - Note location of APK file

## TWA Validation Setup

- [ ] **Get SHA256 fingerprint**
  - Run: `keytool -list -v -keystore android.keystore -alias android`
  - Copy the SHA256 fingerprint

- [ ] **Update assetlinks.json**
  - Paste SHA256 into `public/.well-known/assetlinks.json`
  - Replace: `REPLACE_WITH_YOUR_SHA256_FROM_SIGNING_KEY_INFO_TXT`

- [ ] **Deploy assetlinks.json**
  - Build your website: `npm run build`
  - Deploy to production
  - Verify file is accessible at: https://app.hostelledger.aarx.online/.well-known/assetlinks.json

- [ ] **Verify Digital Asset Links**
  - Visit: https://developers.google.com/digital-asset-links/tools/generator
  - Site: app.hostelledger.aarx.online
  - Package: online.aarx.hostelledger.twa
  - Fingerprint: [Your SHA256]
  - Click "Test statement"
  - Should show: ✓ Success

## Testing

- [ ] **Transfer APK to phone**
  - File: `android/app-release-universal.apk`
  - Use USB, email, or cloud storage

- [ ] **Install on Android device**
  - Enable "Install from Unknown Sources"
  - Install the APK
  - Open the app

- [ ] **Test TWA validation**
  - [ ] App opens without browser address bar
  - [ ] App icon appears correctly
  - [ ] Splash screen shows
  - [ ] All features work correctly

- [ ] **Test TWA detection**
  - [ ] Check if `useTWA()` hook returns true
  - [ ] Verify TWA-specific content shows
  - [ ] Test navigation and deep links

- [ ] **Test offline functionality**
  - [ ] Turn off internet
  - [ ] App still works
  - [ ] Cached content loads

## Optional Enhancements

- [ ] **Add TWA-specific features**
  - [ ] Hide "Download App" button in TWA
  - [ ] Show app rating prompt
  - [ ] Add app-specific navigation
  - [ ] Implement TWA analytics tracking

- [ ] **Customize app experience**
  - [ ] Update `twa-manifest.json` for customizations
  - [ ] Add shortcuts
  - [ ] Configure splash screen
  - [ ] Set up deep linking

## Play Store Preparation

- [ ] **Create Play Store assets**
  - [ ] App icon (512x512)
  - [ ] Feature graphic (1024x500)
  - [ ] Screenshots (at least 2)
  - [ ] App description
  - [ ] Privacy policy URL

- [ ] **Prepare AAB file**
  - File: `android/app-release-bundle.aab`
  - This is what you upload to Play Store

- [ ] **Create Play Console account**
  - Visit: https://play.google.com/console
  - Pay $25 one-time fee
  - Complete registration

- [ ] **Upload to Play Store**
  - Create new app
  - Upload AAB file
  - Fill in store listing
  - Submit for review

## Important Files to Backup

- [ ] **android/android.keystore**
  - ⚠️ CRITICAL: You need this for ALL future updates!
  - Store securely (cloud backup, password manager, etc.)
  
- [ ] **Keystore password**
  - Save in password manager
  - You'll need it for every update

- [ ] **android/twa-manifest.json**
  - Contains all app configuration
  - Backup for reference

## Troubleshooting

If you encounter issues, check:

- [ ] JDK is properly installed and in PATH
- [ ] Android SDK is properly installed
- [ ] Keystore and key passwords are identical
- [ ] assetlinks.json is accessible online
- [ ] SHA256 fingerprint matches exactly
- [ ] Manifest is valid JSON
- [ ] Icons are correct sizes

## Next Steps After First Build

1. Test thoroughly on multiple Android devices
2. Gather feedback from beta testers
3. Fix any issues
4. Prepare Play Store listing
5. Submit to Play Store
6. Monitor reviews and crash reports

## Updating Your App

When you need to update:

1. Make changes to your website
2. Deploy website changes
3. In `android` folder:
   - Update version in `twa-manifest.json`
   - Run: `bubblewrap update`
   - Run: `bubblewrap build --universalApk`
4. Test new APK
5. Upload new AAB to Play Store

## Resources

- Bubblewrap Documentation: https://github.com/GoogleChromeLabs/bubblewrap
- TWA Documentation: https://developer.chrome.com/docs/android/trusted-web-activity/
- Digital Asset Links: https://developers.google.com/digital-asset-links
- Play Console: https://play.google.com/console
- Your Setup Guide: BUBBLEWRAP_SETUP_GUIDE.md
- Usage Examples: TWA_USAGE_EXAMPLES.md

---

**Current Status**: Ready to start! Follow BUBBLEWRAP_SETUP_GUIDE.md for detailed instructions.
