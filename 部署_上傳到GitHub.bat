@echo off
title Deploy to GitHub - aboutlife
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto NOGIT

if exist ".git" goto HASREPO
git init -b main
:HASREPO

git config user.name >nul 2>nul || git config user.name "wowwow3100-ctrl"
git config user.email >nul 2>nul || git config user.email "wowwow3100@gmail.com"

git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin https://github.com/wowwow3100-ctrl/aboutlife.git

git add -A
git commit -m "fortune site update" >nul 2>nul

echo.
echo Pushing to GitHub... (a browser login window may pop up - please authorize)
echo.
git push -u origin main
if errorlevel 1 goto FAILED

echo.
echo ==============================================
echo   PUSH OK!  Go back to Claude to continue.
echo ==============================================
pause
exit /b 0

:NOGIT
echo [ERROR] Git not found. Opening download page...
echo         Install it (just click Next all the way), then run this file again.
start https://git-scm.com/download/win
pause
exit /b 1

:FAILED
echo.
echo [WARN] Push failed. Usually the login was not finished, or no network.
echo        Just run this file again to retry.
pause
exit /b 1
