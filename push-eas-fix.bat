@echo off
setlocal enabledelayedexpansion
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

echo Staging changes...
git add .

echo Committing...
git commit -m "Fix EAS build: remove --non-interactive flag and configure credentials properly"

echo Pushing to GitHub...
git push origin main

echo Done!
pause
