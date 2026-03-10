@echo off
setlocal enableextensions enabledelayedexpansion
cd /d "%~dp0"

set "LOG=%~dp0start-server.log"
echo.>>"%LOG%"
echo ===== [%DATE% %TIME%] start-server.bat begin =====>>"%LOG%"

REM PM2 のフルパスを指定（タスクスケジューラで PATH が通らない対策）
set "PM2=%APPDATA%\npm\pm2.cmd"
echo PM2 path: "%PM2%" >>"%LOG%"

echo Running build...>>"%LOG%"
call npm run build 1>>"%LOG%" 2>>&1
if errorlevel 1 (
    echo [ERROR] Build failed. See log: "%LOG%"
    echo [ERROR] Build failed.>>"%LOG%"
    exit /b 1
)

if not exist "server-dist\server.js" (
    echo [ERROR] server-dist\server.js not found after build.>>"%LOG%"
    echo [ERROR] server-dist\server.js not found after build.
    exit /b 1
)

if exist "%PM2%" (
    echo Stopping existing PM2 app if any...>>"%LOG%"
    "%PM2%" delete nanase-toolbox 1>>"%LOG%" 2>>&1
    echo Starting PM2 app...>>"%LOG%"
    "%PM2%" start server-dist\server.js --name "nanase-toolbox" --update-env 1>>"%LOG%" 2>>&1
    if not errorlevel 1 (
        echo [OK] Server started under PM2 as "nanase-toolbox".
        echo [OK] PM2 start succeeded.>>"%LOG%"
        goto :eof
    ) else (
        echo [WARN] PM2 start failed, falling back to direct node.>>"%LOG%"
    )
)

echo Starting with node directly (fallback)...>>"%LOG%"
start /MIN "nanase-toolbox" node server-dist\server.js
if errorlevel 1 (
    echo [ERROR] Node start failed. See log: "%LOG%"
    echo [ERROR] Node start failed.>>"%LOG%"
    exit /b 1
)
echo [OK] Server started via node (fallback).>>"%LOG%"
echo [OK] Server started via node (fallback).

echo ===== [%DATE% %TIME%] start-server.bat end =====>>"%LOG%"
endlocal