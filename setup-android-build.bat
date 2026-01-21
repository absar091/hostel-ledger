@echo off
echo ========================================
echo Hostel Ledger - Android Build Setup
echo ========================================
echo.

REM Check if android folder exists
if exist "android" (
    echo Android folder already exists!
    echo.
    choice /C YN /M "Do you want to delete it and start fresh"
    if errorlevel 2 goto :skip_delete
    if errorlevel 1 (
        echo Deleting android folder...
        rmdir /s /q android
    )
)

:skip_delete
REM Create android folder
if not exist "android" (
    echo Creating android folder...
    mkdir android
    echo Android folder created!
)

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Open a new terminal in the 'android' folder
echo 2. Run: npm install -g @bubblewrap/cli
echo 3. Run: bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest
echo 4. Follow the prompts (see BUBBLEWRAP_SETUP_GUIDE.md)
echo 5. Run: bubblewrap build --universalApk
echo.
echo For detailed instructions, see: BUBBLEWRAP_SETUP_GUIDE.md
echo ========================================
echo.
pause
