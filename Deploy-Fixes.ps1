$ErrorActionPreference = "Continue"

Write-Host "========== DEPLOYMENT SCRIPT ==========" -ForegroundColor Green
Write-Host ""

Write-Host "[1] Checking Git Status..." -ForegroundColor Cyan
$status = git status --porcelain 2>&1
if ($status) {
    Write-Host "Modified files:" -ForegroundColor Yellow
    Write-Host $status
} else {
    Write-Host "No uncommitted changes" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2] Staging All Changes..." -ForegroundColor Cyan
git add -A 2>&1 | Write-Host

Write-Host ""
Write-Host "[3] Creating Commit..." -ForegroundColor Cyan
$commitMsg = "Fix: Adviser data fetching - file-based controllers and error handling"
git commit -m $commitMsg --no-edit 2>&1 | Write-Host

Write-Host ""
Write-Host "[4] Pulling Latest Remote..." -ForegroundColor Cyan
git pull origin main --ff-only 2>&1 | Write-Host

Write-Host ""
Write-Host "[5] Pushing to Production..." -ForegroundColor Cyan
$pushOutput = git push -u origin main 2>&1
Write-Host $pushOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The fixes are now deployed. You should see changes in 1-2 minutes at:" -ForegroundColor Green
    Write-Host "https://deployed-ils-wmsu.vercel.app/admin/assign-adviser" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Steps to verify:" -ForegroundColor Green
    Write-Host "1. Refresh the page (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "2. Adviser dropdown should be FILLED with names" -ForegroundColor White
    Write-Host "3. Classes should show assigned advisers" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  Deployment had issues. Attempting recovery..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Trying merge with remote..." -ForegroundColor Cyan
    git pull origin main -X theirs 2>&1 | Write-Host
    
    Write-Host ""
    Write-Host "Retrying push..." -ForegroundColor Cyan
    $retryPush = git push origin main 2>&1
    Write-Host $retryPush
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Recovery successful!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Push still failing. Manual intervention needed." -ForegroundColor Red
        Write-Host "Run these commands in PowerShell:" -ForegroundColor Yellow
        Write-Host "  git pull origin main -X theirs" -ForegroundColor White
        Write-Host "  git push origin main" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
