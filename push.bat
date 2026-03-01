@echo off
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
git config core.pager ""
git add codemagic.yaml
git commit -m "Remove --non-interactive to allow keystore generation"
git push origin main
echo Done!
pause
