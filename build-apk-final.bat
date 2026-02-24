@echo off
setlocal enabledelayedexpansion

cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp"

set EXPO_TOKEN=8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8

echo.
echo ========================================
echo Starting APK Build...
echo ========================================
echo.
echo Project: %cd%
echo Token: %EXPO_TOKEN%
echo.

REM Try building with preview profile
echo Submitting build to EAS...
(echo y) | eas build --platform android --profile preview --wait

echo.
echo Build command completed with exit code: %ERRORLEVEL%
pause
