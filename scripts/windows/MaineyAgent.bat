@echo off
setlocal
set REPO_ROOT=%~dp0\..\..
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\mainey_agent_run.ps1"
echo.
echo Press any key to close...
pause >nul
endlocal

