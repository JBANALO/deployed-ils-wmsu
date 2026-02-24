@echo off
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
set GIT_EDITOR=notepad
set GIT_SEQUENCE_EDITOR=notepad
git push -u origin main --force
echo.
echo Build triggered! Check GitHub Actions: https://github.com/JBANALO/deployed-ils-wmsu/actions
pause
