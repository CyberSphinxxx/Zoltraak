@echo off
title Push Zoltraak to GitHub
cd /d "%~dp0"
echo ========================================================
echo Pushing Zoltraak to https://github.com/CyberSphinxxx/Zoltraak
echo ========================================================
git push -u origin main
echo.
pause
