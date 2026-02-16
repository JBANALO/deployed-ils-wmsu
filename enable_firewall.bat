@echo off
REM Enable port 3001 for mobile app connection
netsh advfirewall firewall add rule name="Node Backend 3001" dir=in action=allow protocol=tcp localport=3001 enable=yes
netsh advfirewall firewall add rule name="Node Backend 3001 UDP" dir=in action=allow protocol=udp localport=3001 enable=yes

echo.
echo ========================================
echo Firewall rules added successfully!
echo Port 3001 is now open for your mobile app
echo ========================================
echo.
pause
