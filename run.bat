@echo off
cd /d "%~dp0"

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
echo Once it says "Ready", open http://localhost:3000 in your browser.
echo Keep this window open while you use the app. Close it to stop.
call npm start
goto :eof

:error
echo.
echo Something went wrong. Copy the error above and share it for help.
pause
