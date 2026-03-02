@echo off
setlocal enabledelayedexpansion

REM Set environment to prevent interactive editor
set GIT_EDITOR=nul
set GIT_SEQUENCE_EDITOR=nul

REM Navigate to repo
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

echo.
echo ====================================================
echo     PUSHING ADVISER DATA FIX TO GITHUB
echo ====================================================
echo.

REM Step 1: Add all files
echo [Step 1/5] Adding all changes...
git add -A
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo OK
echo.

REM Step 2: Commit
echo [Step 2/5] Committing changes...
git commit -m "URGENT: Fix adviser data - gradeLevel/section matching, teacherControllerFile, error handling"
if errorlevel 1 (
    echo ERROR: Failed to commit
    pause
    exit /b 1
)
echo OK
echo.

REM Step 3: Pull latest
echo [Step 3/5] Pulling latest from remote...
git pull origin main --no-edit 2>nul || git pull origin main -X theirs 2>nul
echo OK
echo.

REM Step 4: Push
echo [Step 4/5] Pushing to GitHub...
git push origin main -v
if errorlevel 1 (
    echo.
    echo ERROR: Push failed. Trying force push...
    git push origin main --force-with-lease -v
)
echo.
echo ====================================================
echo      ADVISER FIX DEPLOYMENT INITIATED!
echo ====================================================
echo.
echo Next steps:
echo  1. Wait 1-2 minutes for production rebuild
echo  2. Visit: https://deployed-ils-wmsu.vercel.app/admin/assign-adviser
echo  3. Refresh page (Ctrl+Shift+R)
echo  4. Adviser dropdown should now show all advisers!
echo.
pause
