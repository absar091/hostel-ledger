@echo off
echo ========================================
echo FINAL CACHE FIX - CreateGroupSheet
echo ========================================
echo.

echo Step 1: Killing all Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting ALL cache folders...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo   - Deleted node_modules\.vite
)
if exist .vite (
    rmdir /s /q .vite
    echo   - Deleted .vite
)
if exist dist (
    rmdir /s /q dist
    echo   - Deleted dist
)

echo Step 3: Starting dev server on NEW PORT 8081...
echo.
start cmd /k "set PORT=8081 && npm run dev"

echo.
echo ========================================
echo WAIT 10 SECONDS FOR SERVER TO START
echo ========================================
timeout /t 10 /nobreak

echo.
echo ========================================
echo NOW DO THIS:
echo ========================================
echo 1. Open Chrome/Edge in INCOGNITO: Ctrl+Shift+N
echo 2. Go to: http://localhost:8081
echo 3. Open DevTools (F12)
echo 4. Go to Application tab
echo 5. Click "Service Workers" 
echo 6. Click "Unregister" on any workers
echo 7. Close DevTools
echo 8. Hard Refresh: Ctrl+Shift+R
echo 9. Test CreateGroupSheet
echo.
echo If STILL showing old version:
echo - The file might not be saved correctly
echo - Check your editor if file has unsaved changes
echo ========================================
pause
