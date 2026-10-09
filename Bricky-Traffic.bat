@echo off
setlocal
chcp 65001 >nul
title Bricky Traffic Report

where ssh >nul 2>nul
if errorlevel 1 (
  echo ERROR: OpenSSH Client is not installed or is not available in PATH.
  echo Install it from Windows Optional Features and run this file again.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bricky-traffic-report.ps1"
set "REPORT_EXIT=%ERRORLEVEL%"

echo.
if not "%REPORT_EXIT%"=="0" echo The report ended with an error. See the message above.
pause
exit /b %REPORT_EXIT%
