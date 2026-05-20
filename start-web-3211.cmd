@echo off
setlocal
cd /d "%~dp0"
if not exist ".tmp" mkdir ".tmp"
set "PORT=3211"
set "PYTHON=D:\python\python.exe"
set "PYTHON_EXE=D:\python\python.exe"
"C:\Program Files\nodejs\node.exe" server.js >> ".tmp\server-3211.log" 2>&1
