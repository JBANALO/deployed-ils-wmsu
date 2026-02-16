@echo off
REM APK Build Script for WMSU ElemScan
setlocal enabledelayedexpansion

set "EXPO_TOKEN=F1DS1ruZeSpuosnJtVtl5kCcq4QfHZ6Q0dv4Tq1W"
set "EAS_BUILD_NO_EXPO_GO_WARNING=true"

echo.
echo ========================================
echo   WMSU ElemScan - APK Build Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "app.json" (
    echo ERROR: app.json not found. Please run this from MyNewApp directory.
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo.
echo Step 2: Building APK...
echo Please wait, this may take 10-20 minutes...
echo Creating EAS project if needed...
echo y | call eas build --platform android

echo.
echo ========================================
echo Build complete! 
echo Check https://expo.dev/projects/@jossiebanalo for your APK
echo ========================================

pause