@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Bitte Node.js 22 oder neuer von https://nodejs.org installieren.
  echo Danach dieses Fenster schliessen und start-local.cmd erneut starten.
  pause
  exit /b 1
)
echo Rewinde: http://127.0.0.1:4173
echo Zum Beenden Strg+C druecken.
node server.mjs
pause
