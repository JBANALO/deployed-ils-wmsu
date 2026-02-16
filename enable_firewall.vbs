Set UAC = CreateObject("Shell.Application")
If Not UAC.IsAdminMode Then
    UAC.ShellExecute "cmd.exe", "/c """ & WScript.ScriptFullName & """", , "runas", 1
    WScript.Quit
End If

Set shell = CreateObject("WScript.Shell")
shell.Run "netsh advfirewall firewall add rule name=""Node Backend 3001"" dir=in action=allow protocol=tcp localport=3001 enable=yes", 1, True
shell.Run "netsh advfirewall firewall add rule name=""Node Backend 3001 UDP"" dir=in action=allow protocol=udp localport=3001 enable=yes", 1, True

MsgBox "Port 3001 is now open! Your mobile app can now connect to your PC." & vbCrLf & vbCrLf & "Backend: 192.168.1.169:3001", 0, "Firewall Updated"
