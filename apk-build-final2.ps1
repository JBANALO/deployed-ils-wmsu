$appDir = 'c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp'
$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'

Set-Location $appDir

Write-Host "==========================================" -ForegroundColor Green
Write-Host "APK Build - Interactive Process" -ForegroundColor Green  
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project: $(Get-Location)"
Write-Host "Token: SET"
Write-Host ""

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "eas"
$psi.Arguments = "build --platform android --profile preview"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $false
$psi.WorkingDirectory = $appDir
$psi.EnvironmentVariables["EXPO_TOKEN"] = "8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8"

Write-Host "Starting build..."
Write-Host ""

$process = [System.Diagnostics.Process]::Start($psi)
$inputSent = $false

# Start thread to read output
$reader = $process.StandardOutput
$asyncRead = $reader.ReadLineAsync()

while (!$process.HasExited) {
    if ($asyncRead.IsCompleted) {
        $line = $asyncRead.Result
        if ($null -ne $line) {
            Write-Host $line
            
            # Check for keystore prompt and respond automatically
            if (!$inputSent -and $line -like "*Generate a new Android Keystore*") {
                Write-Host "[BUILD] Auto-responding to keystore prompt..." -ForegroundColor Yellow
                $process.StandardInput.WriteLine("y")
                $process.StandardInput.Flush()
                $inputSent = $true
                Write-Host "[BUILD] Response sent: y" -ForegroundColor Yellow
            }
            
            # Keep reading
            $asyncRead = $reader.ReadLineAsync()
        }
    }
    Start-Sleep -Milliseconds 100
}

# Read any remaining output
while ($true) {
    $line = $reader.ReadLine()
    if ($null -eq $line) { break }
    Write-Host $line
}

# Read stderr
$stderr = $process.StandardError.ReadToEnd()
if ($stderr) {
    Write-Host "STDERR:" -ForegroundColor Red
    Write-Host $stderr
}

Write-Host ""
Write-Host "Build exit code: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { "Green" } else { "Red" })
Write-Host ""
Write-Host "Checking for completed builds..."
Write-Host ""

eas build:list --platform android --status finished
