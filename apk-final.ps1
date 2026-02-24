Add-Type -AssemblyName System.Windows.Forms

$appDir = 'c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp'
$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'

Set-Location $appDir

Write-Host "==========================================" -ForegroundColor Green
Write-Host "APK Build - Final Attempt" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project: $(Get-Location)"
Write-Host "Profile: preview (APK)"
Write-Host ""

# Create a proper interactive process with input handling
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "eas"
$psi.Arguments = "build --platform android --profile preview"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $false
$psi.WorkingDirectory = $appDir

# Set environment for the process
$psi.EnvironmentVariables["EXPO_TOKEN"] = "8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8"

Write-Host "Starting build process..."
Write-Host ""

$process = [System.Diagnostics.Process]::Start($psi)

# Read output in real time and look for the prompt
$outputBuffer = ""
$inputSent = $false

while (!$process.HasExited) {
    $char = $process.StandardOutput.ReadChar()
    if ($char -ne -1) {
        $outputBuffer += [char]$char
        Write-Host -NoNewline ([char]$char)
        
        # Check if we see the keystore prompt
        if (!$inputSent -and $outputBuffer.Contains("Generate a new Android Keystore")) {
            Write-Host ""
            Write-Host "[Auto-Response] Detected keystore prompt, sending 'y'" -ForegroundColor Yellow
            $process.StandardInput.WriteLine("y")
            $process.StandardInput.Flush()
            $inputSent = $true
            $outputBuffer = ""
        }
    }
}

# Read remaining output
$remaining = $process.StandardOutput.ReadToEnd()
Write-Host $remaining

$errorOutput = $process.StandardError.ReadToEnd()
if ($errorOutput) {
    Write-Host ""
    Write-Host "STDERR:" -ForegroundColor Red
    Write-Host $errorOutput
}

Write-Host ""
Write-Host "Build process completed with exit code: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { "Green" } else { "Red" })

Write-Host ""
Write-Host "Checking EAS for completed builds..."
Write-Host ""

$env:EXPO_TOKEN = '8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8'
eas build:list --platform android --status finished
