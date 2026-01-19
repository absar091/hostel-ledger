@echo off
echo Starting Hostel Ledger Landing Page...
echo.
echo Opening in browser: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
start http://localhost:8000
python -m http.server 8000

pause
