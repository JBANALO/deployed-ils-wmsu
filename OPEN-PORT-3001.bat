@echo off
REM Run PowerShell script as Administrator
REM Right-click this file and select "Run as administrator"

cd /d "%~dp0"

REM Get admin privileges first
:RequestAdminPrivileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

if '%errorlevel%' NEQ '0' (
    echo Requesting administrator privileges...
    goto UACPrompt
) else (
    goto Admin
)

:UACPrompt
echo Set UAC = CreateObject^("Shell.Application"^) > "%TEMP%\getadmin.vbs"
echo UAC.ShellExecute "cmd.exe", "/c cd /d ""%CD%"" && powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""%~nx0""", "", "runas", 1 >> "%TEMP%\getadmin.vbs"
"%TEMP%\getadmin.vbs"
del "%TEMP%\getadmin.vbs"
exit /B

:Admin
echo.
echo ========================================
echo   OPENING PORT 3001 FOR MOBILE APP
echo ========================================
echo.

REM Run the PowerShell script
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "Open-Port-3001.ps1"

pause
