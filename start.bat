@echo off
cd /d "%~dp0"
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if not errorlevel 1 (
  echo A server is already using http://localhost:3000
  echo Open that address in your browser. To restart Ratedly, first run stop.bat.
  pause
  exit /b
)
echo Starting Ratedly at http://localhost:3000
set "RATEDLY_NODE=C:\Users\Yojit\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%RATEDLY_NODE%" (
  "%RATEDLY_NODE%" server.js
) else (
  node server.js
)
pause
