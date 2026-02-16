param(
    [string]$Token = "F1DS1ruZeSpuosnJtVtl5kCcq4QfHZ6Q0dv4Tq1W"
)

$env:EXPO_TOKEN = $Token
$env:EAS_BUILD_NO_EXPO_GO_WARNING = "true"

Write-Host "Starting WMSU ElemScan APK Build..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Change to app directory
$appDir = "C:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp"
Set-Location $appDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Initiating build process..." -ForegroundColor Yellow
Write-Host "This may take 10-20 minutes depending on server queue" -ForegroundColor Yellow
Write-Host ""

# Run build with input simulation
$buildProcess = Start-Process -FilePath "pwsh" -ArgumentList "-Command", "eas build --platform android" -NoNewWindow -PassThru -Wait

if ($buildProcess.ExitCode -eq 0) {
    Write-Host "✓ Build completed successfully!" -ForegroundColor Green
    Write-Host "Check https://expo.dev/projects/@jossiebanalo for your APK download link" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed with exit code: $($buildProcess.ExitCode)" -ForegroundColor Red
    Write-Host "Check the output above for error details" -ForegroundColor Red
}

Read-Host "Press Enter to exit"
