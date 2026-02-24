$appDir = 'c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp'
$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'

Set-Location $appDir

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Building APK with EAS" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Starting: eas build --platform android --profile preview" -ForegroundColor Cyan
Write-Host ""

# Create background job that sends "y" after delay to answer the prompt
$job = Start-Job -ScriptBlock {
    param($dir, $token)
    
    Set-Location $dir
    $env:EXPO_TOKEN = $token
    
    # Use cmd to run eas build with input piped
    $cmd = "cd /d `"$dir`" && set EXPO_TOKEN=$token && echo y | eas build --platform android --profile preview"
    cmd /c $cmd
} -ArgumentList $appDir, "8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8"

# Wait for job and stream output
$output = @()
while ($job.State -eq "Running") {
    $newOutput = Receive-Job -Job $job -ErrorAction SilentlyContinue
    if ($newOutput) {
        Write-Host $newOutput
        $output += $newOutput
    }
    Start-Sleep -Milliseconds 500
}

# Get final output
$finalOutput = Receive-Job -Job $job -ErrorAction SilentlyContinue
if ($finalOutput) {
    Write-Host $finalOutput
    $output += $finalOutput
}

Write-Host ""
Write-Host "Build job completed with state: $($job.State)" -ForegroundColor $(if ($job.State -eq "Completed") { "Green" } else { "Red" })

Remove-Job -Job $job -Force

Write-Host ""
Write-Host "Checking EAS builds..."
Write-Host ""

$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'
eas build:list --platform android
