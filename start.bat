@echo off
setlocal
cd /d "%~dp0"

set "URL=http://127.0.0.1:8080/"
set "PYTHON=%LocalAppData%\Programs\Python\Python312\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

curl.exe --fail --silent --output NUL "%URL%api/bootstrap-status" >nul 2>nul
if not errorlevel 1 goto open

start "" /min "%PYTHON%" "%~dp0app.py"
for /L %%i in (1,1,45) do (
  curl.exe --fail --silent --output NUL "%URL%api/bootstrap-status" >nul 2>nul
  if not errorlevel 1 goto open
  timeout /t 1 /nobreak >nul
)

echo Could not start the registry server. Check that Python is installed and port 8080 is available.
pause
exit /b 1

:open
start "" "%URL%"
exit /b 0
