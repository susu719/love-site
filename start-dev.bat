@echo off
set "NODE_BIN=C:\Users\susu0\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=C:\Users\susu0\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
set "PATH=%NODE_BIN%;%PATH%"
set "NEXT_TELEMETRY_DISABLED=1"

cd /d "%~dp0"
"%PNPM%" dev

pause
