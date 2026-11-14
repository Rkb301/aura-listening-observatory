@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-aura-windows.ps1"
if errorlevel 1 (
  echo AURA could not launch. Check Node.js, Spotify Soloist, and your browser installation.
  pause
)
