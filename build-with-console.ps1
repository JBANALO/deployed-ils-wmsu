$appDir = 'c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp'
$logFile = Join-Path $appDir '..\eas-final-attempt.log'

Write-Host "Starting APK build with real console..." -ForegroundColor Green
Write-Host "Log file: $logFile" -ForegroundColor Green
Write-Host ""

$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'

# Create a batch file that will run in a real CMD console
$batchFile = "$appDir\..\build-command.bat"
$batchContent = @"
@echo off
setlocal enabledelayedexpansion
cd /d "$appDir"
set EXPO_TOKEN=8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8
echo.
echo Starting APK build...
echo.
title Building APK - EAS Build
eas build --platform android --profile preview --wait
echo.
echo Build completed with exit code: %ERRORLEVEL%
echo.
timeout /t 10
"@

Write-Host "Creating batch file: $batchFile"
Set-Content -Path $batchFile -Value $batchContent

Write-Host "Running batch file in real console window..."
Write-Host ""

# Run the batch file in a real, visible console window
# Use /k to keep window open, don't use -NoNewWindow so a new window is created
Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$batchFile`"" -Wait

Write-Host ""
Write-Host "Build process finished. Checking EAS for completed builds..."
Write-Host ""

Set-Location $appDir
$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'
eas build:list --platform android --status finished

Write-Host ""
Write-Host "Done!"
