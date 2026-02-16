
# Run this file as Administrator in PowerShell to open port 3001

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as ADMINISTRATOR!"
    Write-Host "Right-click PowerShell and select 'Run as administrator'"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Running as Administrator..." -ForegroundColor Green
Write-Host ""

# Add firewall rule for port 3001
Write-Host "Adding firewall rule for port 3001..."
netsh advfirewall firewall add rule name="Node App 3001" dir=in action=allow protocol=tcp localport=3001 enable=yes profile=any remoteip=any > $null 2>&1

# Verify rule was added
$rule = netsh advfirewall firewall show rule name="Node App 3001" 2>&1
if ($rule -like "*Rule Name*") {
    Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Port 3001 is now OPEN for your mobile app!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your mobile app should now be able to connect to:"
    Write-Host "  📱 http://192.168.1.169:3001" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to add firewall rule" -ForegroundColor Red
    Write-Host "Try running: netsh advfirewall firewall add rule name=""Node App 3001"" dir=in action=allow protocol=tcp localport=3001"
}

Write-Host ""
Read-Host "Press Enter to close"
