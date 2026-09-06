@echo off
title Zoltraak Bot and Dashboard
cd /d "%~dp0"

echo ========================================================
echo  [+] Zoltraak Autonomous Tactical Companion
echo  Opening Web Dashboard: http://localhost:3000
echo ========================================================
echo.

:: Automatically launch the browser to the web dashboard in background after 1s
start /b "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:3000"

:: Start Zoltraak using npm start
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [!] npm start encountered an issue, launching directly with node...
    node bot.js
)

echo.
pause
