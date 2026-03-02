@echo off
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

echo ========================================
echo FINAL PUSH - Adviser Data Fix Deployment
echo ========================================

REM Check git status
echo.
echo [1/5] Checking git status...
git status

echo.
echo [2/5] Adding ALL changes...
git add -A

echo.
echo [3/5] Committing changes...
git commit -m "URGENT FIX: Adviser data fetching - gradeLevel/section matching

- Enhanced classController.js with adviser lookup by grade/section
- Created teacherControllerFile.js for file-based teacher/adviser API
- Updated AdminAssignAdviser.jsx with error handling
- Updated routes to use file-based controllers
- Fix for adviser dropdown showing correct assignments"

echo.
echo [4/5] Pulling latest remote...
git pull origin main --no-edit || git pull origin main -X theirs

echo.
echo [5/5] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Production site rebuilding... wait 1-2 minutes then visit:
echo https://deployed-ils-wmsu.vercel.app/admin/assign-adviser
echo.
pause
