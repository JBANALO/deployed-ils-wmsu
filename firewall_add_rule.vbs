' Add Firewall Rule for Node.js Port 3001
Set objShell = CreateObject("Shell.Application")
objShell.ShellExecute "cmd.exe", "/c netsh advfirewall firewall add rule name=""Node.js Port 3001"" dir=in action=allow protocol=tcp localport=3001 && pause", "", "runas", 1
