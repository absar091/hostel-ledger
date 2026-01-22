@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Vite cache...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite

echo Starting dev server...
start cmd /k "npm run dev"

echo.
echo Dev server restarting...
echo Please wait 5 seconds, then open: http://localhost:8080
echo.
echo IMPORTANT: After opening, press Ctrl+Shift+R to hard refresh!
pause
