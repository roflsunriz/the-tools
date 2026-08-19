#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

$appName = 'nanase-toolbox'
$logPath = Join-Path -Path $PSScriptRoot -ChildPath 'stop-server.log'
$helperPath = Join-Path -Path $PSScriptRoot -ChildPath 'server-process-helpers.ps1'

. $helperPath

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8WithoutBom
$OutputEncoding = $utf8WithoutBom
$env:NO_COLOR = '1'

Initialize-Utf8Log -Path $logPath

function Write-LifecycleLog {
    param([string]$Message)

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Utf8LogLine -Path $logPath -Message "[$timestamp] $Message"
}

function Write-Status {
    param([string]$Message)

    Write-LifecycleLog $Message
    Write-Information -MessageData $Message -InformationAction Continue
}

function Get-DirectNodeProcess {
    param([Parameter(Mandatory = $true)][string]$ServerJs)

    $escapedServerJs = [regex]::Escape($ServerJs)
    return @(
        Get-CimInstance Win32_Process |
            Where-Object {
                $_.Name -ieq 'node.exe' -and
                $_.CommandLine -and
                $_.CommandLine -match $escapedServerJs
            }
    )
}

$scriptExitCode = 0
Write-LifecycleLog '===== stop-server.ps1 begin ====='
try {
    $pm2Path = Join-Path -Path $env:APPDATA -ChildPath 'npm\pm2.cmd'
    $serverJs = Join-Path -Path $PSScriptRoot -ChildPath 'server-dist\server.js'
    Write-LifecycleLog "PM2 path: $pm2Path"

    if (Test-Path -LiteralPath $pm2Path) {
        $before = Get-Pm2AppState -Pm2Path $pm2Path -AppName $appName
        if (-not $before.QuerySucceeded) {
            throw $before.FailureReason
        }
        Write-Status (Format-Pm2AppState -State $before)

        if ($before.Exists) {
            Write-Status 'PM2 action: delete'
            $result = Invoke-Pm2Command -Pm2Path $pm2Path -Pm2Arguments @('delete', $appName)
            if ($result.ExitCode -ne 0) {
                throw (Get-Pm2CommandFailureReason -Result $result)
            }

            $after = Wait-Pm2AppState -Pm2Path $pm2Path -AppName $appName -ExpectedStatus 'absent'
            Write-Status (Format-Pm2AppState -State $after)
            if (-not $after.QuerySucceeded) {
                throw $after.FailureReason
            }
            if ($after.Exists) {
                throw "PM2 app '$appName' is still registered after delete."
            }
        }
        else {
            Write-Status '[INFO] PM2 app is already absent; delete was skipped.'
        }
    }
    else {
        Write-Status '[INFO] PM2 is not installed; PM2 stop was skipped.'
    }

    $nodeProcesses = @(Get-DirectNodeProcess -ServerJs $serverJs)
    foreach ($process in $nodeProcesses) {
        try {
            Write-Status "Direct node action: stop pid=$($process.ProcessId)"
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        }
        catch {
            throw "Could not stop direct node process $($process.ProcessId): $($_.Exception.Message)"
        }
    }

    $remainingNodeProcesses = @(Get-DirectNodeProcess -ServerJs $serverJs)
    if ($remainingNodeProcesses.Count -gt 0) {
        $remainingPids = @($remainingNodeProcesses | ForEach-Object { $_.ProcessId }) -join ', '
        throw "Direct node process is still running after stop: pid=$remainingPids"
    }

    Write-Status 'Direct node state: status=absent'
    Write-Status '[OK] Server state after stop: PM2 app absent; direct node process absent.'
}
catch {
    $scriptExitCode = 1
    Write-Status "[ERROR] Server stop failed: $($_.Exception.Message)"
    Write-Status "[ERROR] Details: $logPath"
}
finally {
    Write-LifecycleLog "===== stop-server.ps1 end (exitCode=$scriptExitCode) ====="
}

exit $scriptExitCode
