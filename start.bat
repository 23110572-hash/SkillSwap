@echo off
REM SkillSwap Application Startup Script
setlocal enabledelayedexpansion

echo ========================================
echo   SkillSwap - Starting Application
echo ========================================
echo.

set "ROOT=%~dp0"
set "VENV=%ROOT%.venv\Scripts\activate.bat"
set "VENV_PYTHON=%ROOT%.venv\Scripts\python.exe"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

REM Check virtual environment
if not exist "%VENV%" (
    echo [ERROR] Virtual environment not found.
    echo Run: python -m venv .venv
    echo Then: .venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

REM Kill anything already on port 5000 to avoid "Address already in use"
echo Clearing port 5000...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr /R ":5000 " ^| findstr "LISTENING"') do (
    echo   Killing PID %%P on port 5000
    taskkill /PID %%P /F >nul 2>&1
)

REM Create .env if missing
if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

echo Starting Backend...
start "SkillSwap Backend" cmd /k ""%VENV_PYTHON%" "%BACKEND%\app.py" 2>&1 || (echo. & echo [ERROR] Backend failed to start. Check above for details. & pause)"

echo Starting Frontend...
start "SkillSwap Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo Waiting for frontend on port 5173...
set /a TRIES=0

:WAIT
netstat -ano 2>nul | findstr ":5173" | findstr "LISTENING" >nul
if not errorlevel 1 goto OPEN
set /a TRIES+=1
if !TRIES! geq 20 goto OPEN
timeout /t 1 /nobreak >nul
goto WAIT

:OPEN
echo Opening browser...
start "" http://localhost:5173

echo.
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
echo   Close this window. Keep Backend and
echo   Frontend windows open.
echo ========================================
pause
