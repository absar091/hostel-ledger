@echo off
echo ========================================
echo Hostel Ledger - Android App Builder
echo ========================================
echo.

REM Check if android folder exists
if not exist "android" (
    echo ERROR: Android folder not found!
    echo Please run setup-android-build.bat first
    echo.
    pause
    exit /b 1
)

REM Navigate to android folder
cd android

REM Check if twa-manifest.json exists
if not exist "twa-manifest.json" (
    echo ERROR: twa-manifest.json not found!
    echo Please initialize Bubblewrap first:
    echo   bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest
    echo.
    cd ..
    pause
    exit /b 1
)

echo Building Android app...
echo This may take a few minutes...
echo.

REM Build the app
call bubblewrap build --universalApk

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK file: android\app-release-universal.apk
    echo AAB file: android\app-release-bundle.aab
    echo.
    echo Next steps:
    echo 1. Transfer APK to your Android phone
    echo 2. Install and test the app
    echo 3. If address bar shows, update assetlinks.json
    echo 4. Upload AAB to Play Store when ready
    echo.
) else (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo Common issues:
    echo - JDK not installed or not in PATH
    echo - Android SDK not configured
    echo - Keystore password incorrect
    echo.
    echo See BUBBLEWRAP_SETUP_GUIDE.md for help
    echo.
)

cd ..
pause
