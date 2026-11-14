@echo off
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install from https://nodejs.org/
  pause
  exit /b 1
)
echo Starting AURA at http://127.0.0.1:4373
start "" http://127.0.0.1:4373
node server.mjs
pause
