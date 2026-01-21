# Bubblewrap Quick Command Reference

Quick reference for all Bubblewrap commands you'll need.

## Initial Setup

```bash
# Install Bubblewrap globally
npm install -g @bubblewrap/cli

# Check version
bubblewrap --version

# Get help
bubblewrap --help
```

## Project Initialization

```bash
# Create android folder
mkdir android
cd android

# Initialize from manifest URL
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest

# Initialize with custom JDK path (if auto-install fails)
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest --jdkPath="C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
```

## Building

```bash
# Build APK and AAB (recommended)
bubblewrap build --universalApk

# Build only AAB (for Play Store)
bubblewrap build

# Build with specific signing key
bubblewrap build --signingKeyPath=./android.keystore --signingKeyAlias=android
```

## Updating

```bash
# Update project configuration from manifest
bubblewrap update

# Update and rebuild
bubblewrap update && bubblewrap build --universalApk
```

## Keystore Management

```bash
# List keystore contents
keytool -list -v -keystore android.keystore -alias android

# Get SHA256 fingerprint only
keytool -list -v -keystore android.keystore -alias android | findstr SHA256

# Verify keystore password
keytool -list -keystore android.keystore

# Change keystore password (if needed)
keytool -storepasswd -keystore android.keystore
```

## Validation & Testing

```bash
# Validate twa-manifest.json
bubblewrap validate

# Check if assetlinks.json is accessible
curl https://app.hostelledger.aarx.online/.well-known/assetlinks.json

# Install APK to connected Android device via ADB
adb install app-release-universal.apk

# Uninstall from device
adb uninstall online.aarx.hostelledger.twa
```

## Version Management

```bash
# Before building a new version, update in twa-manifest.json:
# "versionCode": 2,  (increment by 1)
# "versionName": "1.1.0",  (semantic versioning)

# Then update and build
bubblewrap update
bubblewrap build --universalApk
```

## Troubleshooting Commands

```bash
# Check Java version
java --version

# Check Node version
node --version

# Check npm global packages
npm list -g --depth=0

# Clear Bubblewrap cache (if issues occur)
# Windows:
rmdir /s /q %USERPROFILE%\.bubblewrap
# Then reinstall: npm install -g @bubblewrap/cli

# Verify Android SDK
# Check if ANDROID_HOME is set
echo %ANDROID_HOME%

# List installed Android SDK packages
sdkmanager --list
```

## File Locations

```bash
# After build, files are located at:
android/
├── app-release-bundle.aab          # For Play Store
├── app-release-universal.apk       # For testing
├── android.keystore                # BACKUP THIS!
├── twa-manifest.json               # App configuration
└── signing-key-info.txt            # Contains SHA256
```

## Common Workflows

### First Time Build
```bash
cd android
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest
# Answer all questions
bubblewrap build --universalApk
# Get SHA256 from signing-key-info.txt
# Update assetlinks.json with SHA256
# Deploy website
# Test APK
```

### Updating Existing App
```bash
cd android
# Update version in twa-manifest.json
bubblewrap update
bubblewrap build --universalApk
# Test new APK
# Upload new AAB to Play Store
```

### Rebuilding After Changes
```bash
cd android
bubblewrap build --universalApk
```

### Testing on Device
```bash
# Connect Android device via USB
# Enable USB debugging on device
adb devices  # Verify device is connected
adb install -r app-release-universal.apk  # -r replaces existing
adb logcat | findstr "hostelledger"  # View app logs
```

## Environment Variables (Optional)

```bash
# Set JDK path permanently (Windows)
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"

# Set Android SDK path (if needed)
setx ANDROID_HOME "C:\Users\YourName\AppData\Local\Android\Sdk"

# Add to PATH
setx PATH "%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"
```

## Useful ADB Commands

```bash
# List connected devices
adb devices

# Install APK
adb install app-release-universal.apk

# Reinstall (replace existing)
adb install -r app-release-universal.apk

# Uninstall app
adb uninstall online.aarx.hostelledger.twa

# View app logs
adb logcat | findstr "chromium"

# Clear app data
adb shell pm clear online.aarx.hostelledger.twa

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4
# Stop with Ctrl+C, then:
adb pull /sdcard/demo.mp4
```

## Play Store Upload Commands

```bash
# Verify AAB file
bundletool build-apks --bundle=app-release-bundle.aab --output=test.apks

# Extract APK from AAB for testing
bundletool build-apks --bundle=app-release-bundle.aab --output=test.apks --mode=universal
```

## Quick Fixes

### JDK Not Found
```bash
# Download from: https://adoptium.net/
# Install, then:
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest --jdkPath="C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
```

### Build Fails
```bash
# Clean and rebuild
cd android
rmdir /s /q app
bubblewrap build --universalApk
```

### Password Error
```bash
# Passwords must match! If you need to recreate keystore:
del android.keystore
bubblewrap build --universalApk
# You'll be prompted to create new keystore
# NOTE: This creates a NEW keystore - you can't update existing Play Store app with it!
```

## Important Notes

1. **NEVER lose android.keystore** - You can't update your Play Store app without it!
2. **Backup your keystore password** - Store it securely
3. **Increment version** before each Play Store update
4. **Test APK** before uploading AAB to Play Store
5. **Wait 24-48 hours** for Digital Asset Links to propagate

## Getting Help

```bash
# Bubblewrap help
bubblewrap --help
bubblewrap init --help
bubblewrap build --help
bubblewrap update --help

# Check Bubblewrap issues
# https://github.com/GoogleChromeLabs/bubblewrap/issues
```

---

**Pro Tip**: Create a batch file for common tasks:

```batch
@echo off
REM build-app.bat
cd android
echo Building Hostel Ledger Android App...
bubblewrap build --universalApk
echo.
echo Build complete!
echo APK location: android\app-release-universal.apk
echo AAB location: android\app-release-bundle.aab
pause
```

Save as `build-app.bat` in your project root, then just double-click to build!
