@echo off
setlocal
cd /d "%~dp0"
echo FieldFind Scope 2 - local SDK build
node scripts\build-local.mjs
if errorlevel 1 (
  echo.
  echo Build stopped. Read the error above. No successful Power BI package is claimed.
)
pause
