@echo off
setlocal

set "NODE_BIN=C:\Users\susu0\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=C:\Users\susu0\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
set "PATH=%NODE_BIN%;%PATH%"
set "NEXT_TELEMETRY_DISABLED=1"
set "LOG=%~dp0dev-server.log"

cd /d "%~dp0"

echo Starting dev server at %DATE% %TIME% > "%LOG%"
echo Project: %CD% >> "%LOG%"
echo. >> "%LOG%"

echo Starting Next.js dev server...
echo Keep this window open while using the website.
echo.

"%PNPM%" dev

echo. >> "%LOG%"
echo Dev server stopped at %DATE% %TIME% >> "%LOG%"
echo Exit code: %ERRORLEVEL% >> "%LOG%"

echo.
echo Dev server stopped. Exit code: %ERRORLEVEL%
pause
