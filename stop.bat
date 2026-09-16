@echo off
cd /d "%~dp0"
set "RATEDLY_NODE=C:\Users\Yojit\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%RATEDLY_NODE%" set "RATEDLY_NODE=node"
"%RATEDLY_NODE%" -e "fetch('http://localhost:3000/api/server/stop',{method:'POST'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{console.log(d.message);process.exit(0)}).catch(()=>process.exit(1))"
if not errorlevel 1 goto :done
echo This is an older Ratedly server. Trying to stop its port-3000 process...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
  if not defined SEEN_%%P (
    set "SEEN_%%P=1"
    echo Stopping PID %%P...
    taskkill /PID %%P /F
  )
)
:done
pause
