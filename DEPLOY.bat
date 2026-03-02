@echo off
REM ============================================
REM Deploy Adviser Data Fixes to Production
REM ============================================
Setlocal EnableDelayedExpansion
set "GIT_EDITOR=nul"
set "GIT_CONFIG_GLOBAL="

cls
echo.
echo ============================================
echo  DEPLOYING ADVISER DATA FIXES
echo ============================================
echo.

echo [STEP 1] Checking git configuration...
git config --global core.editor
if %errorlevel% neq 0 echo WARNING: Could not check editor config

echo.
echo [STEP 2] Adding all changes...
git add -A
if %errorlevel% neq 0 echo ERROR: git add failed & goto error

echo.
echo [STEP 3] Creating commit...
git commit -m "Fix: Adviser data fetching - file-based controllers" --no-edit 2>nul
if %errorlevel% neq 0 (
    echo (No new changes or commit already exists)
)

echo.
echo [STEP 4] Pulling latest remote changes...
git pull origin main --ff-only 2>nul
if %errorlevel% neq 0 (
    echo WARNING: Could not pull, trying alternate method...
    git pull origin main -X theirs 2>nul
)

echo.
echo [STEP 5] Pushing to production...
git push -u origin main 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo  ✓ DEPLOYMENT SUCCESSFUL!
    echo ============================================
    echo.
    echo Changes have been pushed to GitHub.
    echo Production will update in 1-2 minutes.
    echo.
    echo Access the site at:
    echo https://deployed-ils-wmsu.vercel.app/admin/assign-adviser
    echo.
    echo Refresh the page with: Ctrl+Shift+R
    echo.
    pause
    exit /b 0
) else (
    echo.
    echo WARNING: Push encountered issues
    echo Attempting force merge...
    git pull origin main -X theirs
    git push origin main
    if %errorlevel% equ 0 (
        echo Success after merge!
        pause
        exit /b 0
    ) else (
        goto error
    )
)

:error
echo.
echo ============================================
echo  ✗ DEPLOYMENT FAILED
echo ============================================
echo.
echo Manual alternative:
echo 1. Open GitHub Desktop or GitKraken
echo 2. Commit changes with message "Fix adviser fetching"
echo 3. Push to origin/main
echo.
pause
exit /b 1
