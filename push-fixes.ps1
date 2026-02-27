cd "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
git config core.pager ""
git fetch origin
git reset --hard origin/main
git checkout main
git add package.json codemagic.yaml
git commit -m "Fix: Set CI=true and fallback npm install for CodeMagic builds"
git push -u origin main
Write-Host "Push complete!"
