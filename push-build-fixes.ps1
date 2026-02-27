#!/usr/bin/env powershell
$ErrorActionPreference = "Stop"
Set-Location "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"

# Disable pager
git config core.pager ""

# Add files
Write-Host "Adding files..."
git add package.json codemagic.yaml

# Commit
Write-Host "Committing..."
$output = git commit -m "Fix CodeMagic build: Add CI mode and npm install fallback"
Write-Host $output

# Push
Write-Host "Pushing to GitHub..."
$pushOutput = git push origin main 2>&1
Write-Host $pushOutput

Write-Host "Done!"
