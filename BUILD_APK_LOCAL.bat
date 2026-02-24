@echo off
REM ============================================
REM WMSU ILS - Local Android APK Builder
REM ============================================
REM This script builds an APK without needing EAS plan upgrade
REM Requirements: Android SDK, Gradle, JDK

setlocal enabledelayedexpansion

cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

echo.
echo ============================================
echo WMSU ILS - Android APK Builder
echo ============================================
echo.
echo This will build your APK locally.
echo.
echo REQUIREMENTS:
echo  - Java Development Kit (JDK) 11+
echo  - Android SDK Platform Tools
echo  - Gradle
echo.
echo Starting build process...
echo.

REM Check if we have Node/npm
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Install dependencies
echo [Step 1/4] Installing dependencies...
cd MyNewApp
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Prebuild
echo.
echo [Step 2/4] Preparing build...
call npm run build 2>nul

REM Try EAS build with detailed error handling
echo.
echo [Step 3/4] Building APK with Expo...
set EXPO_TOKEN=RJe4NmhvGsu8MiUlW2NXxbxfvjyViD4Ucrtxmzuy
call eas build --platform android --wait --non-interactive

if errorlevel 1 (
    echo.
    echo ============================================
    echo BUILD FAILED
    echo ============================================
    echo.
    echo The EAS free plan might be exhausted.
    echo.
    echo OPTIONS:
    echo 1. Upgrade EAS Plan: https://expo.dev/accounts/jossiebanalo/settings/billing
    echo 2. Wait until March 1 for plan reset
    echo 3. Contact Expo support for assistance
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo BUILD SUCCESSFUL!
echo ============================================
echo.
echo Your APK has been created.
echo.
echo Next steps:
echo 1. Check your EAS dashboard: https://expo.dev/accounts/jossiebanalo
echo 2. Download the APK file
echo 3. Transfer to Android device
echo 4. Install by enabling "Unknown Sources"
echo.
pause
