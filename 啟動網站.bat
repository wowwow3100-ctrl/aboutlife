@echo off
title XuanJiGe Fortune Site - http://localhost:3300
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto NONODE

start /min cmd /c "timeout /t 2 >nul & start http://localhost:3300"
node server.js
pause
exit /b 0

:NONODE
echo [ERROR] Node.js not found. Opening download page...
start https://nodejs.org
pause
exit /b 1
