$appDir = 'c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp'
$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'
$env:FORCE_COLOR = '1'

Set-Location $appDir

Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting APK Build with Interactive Input" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Directory: $((Get-Location).Path)"
Write-Host "Token: $([boolean]::Parse($env:EXPO_TOKEN.Length -gt 0))"
Write-Host ""

# Try using a temporary file for input
$tempInput = [System.IO.Path]::GetTempFileName()
Add-Content -Path $tempInput -Value "y"

Write-Host "Using input file: $tempInput"
Write-Host ""
Write-Host "Running: eas build --platform android --profile preview --wait"
Write-Host ""

# Run the command with input redirection
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "cmd"
$processInfo.Arguments = "/c echo y | eas build --platform android --profile preview --wait"
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $false

$process = [System.Diagnostics.Process]::Start($processInfo)

# Write to stdin
$process.StandardInput.WriteLine("y")
$process.StandardInput.Close()

# Read and display output
$output = $process.StandardOutput.ReadToEnd()
$error = $process.StandardError.ReadToEnd()

Write-Host $output
if ($error) { Write-Host $error -ForegroundColor Red }

$process.WaitForExit()

Write-Host ""
Write-Host "Exit Code: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { 'Green' } else { 'Red' })

# Cleanup
Remove-Item -Path $tempInput -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Build completed. Checking for APK..."
Write-Host ""

# Check if build succeeded
eas build:list --platform android --status finished
