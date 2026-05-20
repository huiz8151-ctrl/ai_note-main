@echo off
setlocal
set PORT=3211
set PYTHON=D:\python\python.exe
set PYTHON_EXE=D:\python\python.exe
cd /d F:\ai_note-main\ai_note-main
"C:\Program Files\nodejs\node.exe" server.js >> F:\ai_note-main\ai_note-main\.tmp\server-3211.log 2>&1
