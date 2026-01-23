@echo off
echo ============================================
echo ABSOLUTE FINAL FIX - FORCE NEW CODE
echo ============================================
echo.

echo Killing ALL Node processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo Deleting ALL caches...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite  
if exist dist rmdir /s /q dist

echo.
echo ============================================
echo CRITICAL: DO THIS NOW!
echo ============================================
echo.
echo 1. CLOSE ALL BROWSER WINDOWS (Chrome, Edge, Firefox - ALL OF THEM)
echo 2. Press any key to continue...
pause >nul

echo.
echo Starting dev server...
start cmd /k "npm run dev"

echo.
echo Waiting 10 seconds for server to start...
timeout /t 10 /nobreak

echo.
echo ============================================
echo NOW OPEN BROWSER:
echo ============================================
echo.
echo 1. Open Chrome in INCOGNITO: Ctrl+Shift+N
echo 2. Go to: http://localhost:8080/?nocache=%random%
echo 3. Press F12 to open DevTools
echo 4. Go to Network tab
echo 5. Check "Disable cache" checkbox
echo 6. Refresh page (Ctrl+R)
echo 7. Click "Create New Group" button
echo.
echo YOU SHOULD NOW SEE:
echo - Step 1: "Name & Icon" title
echo - Cover Photo upload section
echo - Group Name input
echo - Emoji picker
echo - NO "Add Members" section visible
echo - "Continue" button at bottom
echo.
echo ============================================
pause
