#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

$logPath = Join-Path -Path $PSScriptRoot -ChildPath 'start-server.log'

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message" -Encoding UTF8
}

Write-Log '===== start-server.ps1 begin ====='

# PM2 path (Task Scheduler does not inherit user PATH)
$pm2Path = Join-Path -Path $env:APPDATA -ChildPath 'npm\pm2.cmd'
Write-Log "PM2 path: $pm2Path"

# --- Build ---
Write-Log 'Running build...'
$buildOutput = & npm run build 2>&1
$buildExitCode = $LASTEXITCODE
$buildOutput | ForEach-Object { Add-Content -LiteralPath $logPath -Value $_ -Encoding UTF8 }

if ($buildExitCode -ne 0) {
    Write-Log '[ERROR] Build failed.'
    Write-Error "Build failed. See log: $logPath"
    exit 1
}

# --- Verify build artifact ---
$serverJs = Join-Path -Path $PSScriptRoot -ChildPath 'server-dist\server.js'
if (-not (Test-Path -LiteralPath $serverJs)) {
    Write-Log '[ERROR] server-dist/server.js not found after build.'
    Write-Error "server-dist/server.js not found after build."
    exit 1
}

# --- Start via PM2 (preferred) ---
if (Test-Path -LiteralPath $pm2Path) {
    Write-Log 'Stopping existing PM2 app if any...'
    & $pm2Path delete nanase-toolbox 2>&1 |
        ForEach-Object { Add-Content -LiteralPath $logPath -Value $_ -Encoding UTF8 }

    Write-Log 'Starting PM2 app...'
    & $pm2Path start $serverJs --name 'nanase-toolbox' --update-env 2>&1 |
        ForEach-Object { Add-Content -LiteralPath $logPath -Value $_ -Encoding UTF8 }

    if ($LASTEXITCODE -eq 0) {
        Write-Log '[OK] PM2 start succeeded.'
        Write-Host '[OK] Server started under PM2 as "nanase-toolbox".'
        Write-Log '===== start-server.ps1 end ====='
        exit 0
    }

    Write-Log '[WARN] PM2 start failed, falling back to direct node.'
}

# --- Fallback: direct node ---
Write-Log 'Starting with node directly (fallback)...'
Start-Process -FilePath 'node' -ArgumentList $serverJs -WindowStyle Minimized

Write-Log '[OK] Server started via node (fallback).'
Write-Host '[OK] Server started via node (fallback).'
Write-Log '===== start-server.ps1 end ====='
