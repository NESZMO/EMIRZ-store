@echo off
cd /d "%~dp0"
title EMIRZ stoRe

if not exist "node_modules" (
  echo Installing dependencies, this only happens once...
  call npm install
  if errorlevel 1 goto :error
)

if not exist ".next" (
  echo Building the app, this only happens once ^(or after an update^)...
  call npm run build
  if errorlevel 1 goto :error
)

echo Starting EMIRZ stoRe...
echo Your browser will open automatically once the app is ready.
echo Keep this window open while you use the app. Minimize it if you like ^- closing it stops the app.

start "" /min powershell -NoProfile -WindowStyle Hidden -Command "while (-not (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Sleep -Milliseconds 500 }; Start-Process 'http://localhost:3000'"

call npm start
goto :eof

:error
echo.
echo Something went wrong. Copy the error above and share it for help.
pause
