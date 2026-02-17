Set objShell = CreateObject("Shell.Application")
objShell.ShellExecute "cmd.exe", "/c cd """ & GetBasePath() & """ && add_firewall_rule.bat", "", "runas", 1

Function GetBasePath()
  GetBasePath = "C:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
End Function
