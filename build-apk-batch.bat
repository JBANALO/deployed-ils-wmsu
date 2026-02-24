@echo off
setlocal enabledelayedexpansion
cd /d "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp"

set EXPO_TOKEN=8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8

REM Create a temporary file with "yes\n" content
(echo y) | eas build --platform android --profile preview

pause
