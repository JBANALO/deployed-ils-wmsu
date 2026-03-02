@echo off
REM Deployment script for adviser data fixes

echo ===== Deploying Adviser Data Fixes =====
echo.

echo Step 1: Checking git status...
git status

echo.
echo Step 2: Pulling latest remote changes...
git pull origin main --ff-only

echo.
echo Step 3: Pushing fixes to production...
git push origin main

echo.
echo ===== Deployment Complete =====
echo The fixes will be deployed to production within 1-2 minutes.
echo You can check the deployment status at:
echo   - GitHub: https://github.com/JBANALO/deployed-ils-wmsu
echo   - Railway: https://railway.app (if using Railway for backend)
echo.
echo The following issues have been fixed:
echo   1. Adviser data is now fetched and displayed on the Assign Adviser page
echo   2. Dropdowns will show all available advisers
echo   3. Classes will show their assigned advisers
echo.
