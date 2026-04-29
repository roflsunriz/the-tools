#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

$logPath = Join-Path -Path $PSScriptRoot -ChildPath 'stop-server.log'

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message" -Encoding UTF8
}

function Write-CommandOutput {
    param([object[]]$Lines)
    $Lines | ForEach-Object {
        Add-Content -LiteralPath $logPath -Value $_ -Encoding UTF8
    }
}

Write-Log '===== stop-server.ps1 begin ====='

# PM2 path (Task Scheduler does not inherit user PATH)
$pm2Path = Join-Path -Path $env:APPDATA -ChildPath 'npm\pm2.cmd'
Write-Log "PM2 path: $pm2Path"

$stoppedAny = $false

# --- Stop PM2 app (preferred) ---
if (Test-Path -LiteralPath $pm2Path) {
    Write-Log 'Stopping PM2 app...'
    $pm2Output = @(& $pm2Path delete nanase-toolbox 2>&1)
    $pm2ExitCode = $LASTEXITCODE
    Write-CommandOutput -Lines $pm2Output

    if ($pm2ExitCode -eq 0) {
        $stoppedAny = $true
        Write-Log '[OK] PM2 app deleted.'
    }
    else {
        Write-Log '[WARN] PM2 delete reported a non-zero exit code.'
    }
}
else {
    Write-Log '[WARN] PM2 path not found.'
}

# --- Stop fallback direct node process ---
$serverJs = Join-Path -Path $PSScriptRoot -ChildPath 'server-dist\server.js'
Write-Log "Searching for direct node processes targeting: $serverJs"

$escapedServerJs = [regex]::Escape($serverJs)
$nodeProcesses = @(
    Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -ieq 'node.exe' -and
        $_.CommandLine -and
        $_.CommandLine -match $escapedServerJs
    }
)

if ($nodeProcesses) {
    foreach ($process in $nodeProcesses) {
        try {
            Write-Log "Stopping process ID $($process.ProcessId)..."
            Stop-Process -Id $process.ProcessId -Force
        }
        catch {
            Write-Log "[WARN] Failed to stop process ID $($process.ProcessId): $($_.Exception.Message)"
        }
    }

    $stoppedAny = $true
    Write-Log "[OK] Stopped $($nodeProcesses.Count) direct node process(es)."
}
else {
    Write-Log '[INFO] No direct node process found.'
}

if ($stoppedAny) {
    Write-Host '[OK] Server stop request completed.'
}
else {
    Write-Host '[INFO] No matching server process was running.'
}

Write-Log '===== stop-server.ps1 end ====='
