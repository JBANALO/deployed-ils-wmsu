@echo off
REM Build APK locally using EAS
setlocal enabledelayedexpansion

cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

echo ========================================
echo WMSU ELS - Local APK Build
echo ========================================
echo.

echo [1/3] Installing dependencies...
cd MyNewApp
call npm install
if errorlevel 1 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

echo.
echo [2/3] Building APK with EAS...
set EXPO_TOKEN=RJe4NmhvGsu8MiUlW2NXxbxfvjyViD4Ucrtxmzuy
call eas build --platform android --wait --non-interactive

if errorlevel 1 (
    echo Error building APK!
    echo Check your EXPO_TOKEN or internet connection
    pause
    exit /b 1
)

echo.
echo [3/3] Build complete!
echo.
echo Your APK should be ready in EAS dashboard:
echo https://expo.dev/accounts/jossiebanalo/projects
echo.
pause
