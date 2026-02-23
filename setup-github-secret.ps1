# Quick setup script to add EAS_TOKEN secret to GitHub Actions
# Must have GitHub CLI (gh) installed: https://cli.github.com/

Write-Host "🔑 Adding EAS_TOKEN secret to GitHub Actions..." -ForegroundColor Cyan

$tokenValue = "8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8"
$repoPath = "JBANALO/deployed-ils-wmsu"

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not found!" -ForegroundColor Red
    Write-Host "Install from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "Or manually add the secret:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/JBANALO/deployed-ils-wmsu/settings/secrets/actions"
    Write-Host "2. Click 'New repository secret'"
    Write-Host "3. Name: EAS_TOKEN"
    Write-Host "4. Value: $tokenValue"
    exit 1
}

# Add the secret
Write-Host "📡 Authenticating with GitHub..." -ForegroundColor Cyan
gh auth status

Write-Host ""
Write-Host "⚙️  Setting secret EAS_TOKEN..." -ForegroundColor Cyan
echo $tokenValue | gh secret set EAS_TOKEN --repo $repoPath

Write-Host ""
Write-Host "✅ Secret added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Now push code to trigger build:" -ForegroundColor Cyan
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Check progress:" -ForegroundColor Cyan
Write-Host "   https://github.com/JBANALO/deployed-ils-wmsu/actions" -ForegroundColor Gray
