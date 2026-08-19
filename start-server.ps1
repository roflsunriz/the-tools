#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

$appName = 'nanase-toolbox'
$serverUri = [uri]'http://127.0.0.1:65505/'
$logPath = Join-Path -Path $PSScriptRoot -ChildPath 'start-server.log'
$secretPath = Join-Path -Path $env:LOCALAPPDATA -ChildPath 'NanaseToolbox\sakura-ai-token.xml'
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

function Write-OutputLinesToLog {
    param([object[]]$Lines)

    ConvertTo-CleanCommandOutput -Lines $Lines |
        ForEach-Object { Add-Utf8LogLine -Path $logPath -Message $_ }
}

function Test-BuildUptodate {
    $serverDist = Join-Path -Path $PSScriptRoot -ChildPath 'server-dist\server.js'
    $frontendDir = Join-Path -Path $PSScriptRoot -ChildPath 'frontend-dist'

    if (-not (Test-Path -LiteralPath $serverDist)) { return $false }
    if (-not (Test-Path -LiteralPath $frontendDir)) { return $false }

    $frontendFiles = @(Get-ChildItem -LiteralPath $frontendDir -Recurse -File)
    if ($frontendFiles.Count -eq 0) { return $false }

    $srcDirs = @(
        (Join-Path -Path $PSScriptRoot -ChildPath 'front-src')
        (Join-Path -Path $PSScriptRoot -ChildPath 'server-src')
    )
    $rootConfigs = @(
        'vite.config.ts', 'tsconfig.json', 'tsconfig.server.json',
        'package.json', 'bun.lock'
    ) | ForEach-Object { Join-Path -Path $PSScriptRoot -ChildPath $_ }

    $newestSrc = [DateTime]::MinValue
    foreach ($directory in $srcDirs) {
        foreach ($file in (Get-ChildItem -LiteralPath $directory -Recurse -File -ErrorAction SilentlyContinue)) {
            if ($file.LastWriteTime -gt $newestSrc) { $newestSrc = $file.LastWriteTime }
        }
    }
    foreach ($path in $rootConfigs) {
        $item = Get-Item -LiteralPath $path -ErrorAction SilentlyContinue
        if ($item -and $item.LastWriteTime -gt $newestSrc) { $newestSrc = $item.LastWriteTime }
    }

    $distDirs = @($frontendDir, (Join-Path -Path $PSScriptRoot -ChildPath 'server-dist'))
    $oldestDist = [DateTime]::MaxValue
    foreach ($directory in $distDirs) {
        foreach ($file in (Get-ChildItem -LiteralPath $directory -Recurse -File -ErrorAction SilentlyContinue)) {
            if ($file.LastWriteTime -lt $oldestDist) { $oldestDist = $file.LastWriteTime }
        }
    }

    if ($newestSrc -eq [DateTime]::MinValue -or $oldestDist -eq [DateTime]::MaxValue) {
        return $false
    }
    return $newestSrc -le $oldestDist
}

function Import-SakuraAiToken {
    if ($env:SAKURA_AI_TOKEN) {
        Write-LifecycleLog 'Sakura AI token is available from the process environment.'
        return
    }
    if (-not (Test-Path -LiteralPath $secretPath)) {
        Write-LifecycleLog 'Sakura AI token is not configured. Unit conversion API will report setup guidance.'
        return
    }

    try {
        $credential = Import-Clixml -LiteralPath $secretPath
        if ($credential -isnot [System.Management.Automation.PSCredential]) {
            throw '保存データの形式が不正です。'
        }
        $env:SAKURA_AI_TOKEN = $credential.GetNetworkCredential().Password
        Write-LifecycleLog 'Sakura AI token was loaded from the protected Windows user store.'
    }
    catch {
        Write-LifecycleLog '[ERROR] Failed to load the protected Sakura AI token.'
        throw 'Sakura AIトークンを復号できません。同じWindowsユーザーで再登録してください。'
    }
}

function Assert-ServerHttpResponse {
    $httpState = Wait-ServerHttpResponse -Uri $serverUri
    if (-not $httpState.Succeeded) {
        throw "Server process is running, but $serverUri did not respond: $($httpState.FailureReason)"
    }
    Write-Status "HTTP state: uri=$serverUri; status=$($httpState.StatusCode)"
}

function Invoke-ServerWithPm2 {
    param(
        [Parameter(Mandatory = $true)][string]$Pm2Path,
        [Parameter(Mandatory = $true)][string]$ServerJs
    )

    $before = Get-Pm2AppState -Pm2Path $Pm2Path -AppName $appName
    if (-not $before.QuerySucceeded) {
        throw $before.FailureReason
    }
    Write-Status (Format-Pm2AppState -State $before)

    if ($before.Exists) {
        $action = 'restart'
        $arguments = @('restart', $appName, '--update-env')
    }
    else {
        $action = 'start'
        $arguments = @('start', $ServerJs, '--name', $appName, '--update-env')
    }

    Write-Status "PM2 action: $action"
    $result = Invoke-Pm2Command -Pm2Path $Pm2Path -Pm2Arguments $arguments
    if ($result.ExitCode -ne 0) {
        throw (Get-Pm2CommandFailureReason -Result $result)
    }

    $after = Wait-Pm2AppState -Pm2Path $Pm2Path -AppName $appName -ExpectedStatus 'online'
    Write-Status (Format-Pm2AppState -State $after)
    if (-not $after.QuerySucceeded) {
        throw $after.FailureReason
    }
    if (-not $after.Exists -or $after.Status -ne 'online') {
        $errorLines = @(Get-Pm2ErrorLogSummary -Path $after.ErrorLogPath)
        if ($errorLines.Count -gt 0) {
            Write-OutputLinesToLog -Lines $errorLines
            throw "PM2 action '$action' did not reach online state. Recent error: $($errorLines -join ' | ')"
        }
        throw "PM2 action '$action' did not reach online state."
    }

    Assert-ServerHttpResponse
    Write-Status "[OK] Server $($action)ed under PM2."
}

function Invoke-ServerDirectly {
    param([Parameter(Mandatory = $true)][string]$ServerJs)

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw 'PM2 and node.exe were not found. Install Node.js and PM2, then run this script again.'
    }

    $stdoutPath = Join-Path -Path $PSScriptRoot -ChildPath 'direct-node-output.log'
    $stderrPath = Join-Path -Path $PSScriptRoot -ChildPath 'direct-node-error.log'
    Write-Status '[WARN] PM2 was not found. Starting the server directly with node.exe.'
    $process = Start-Process `
        -FilePath $nodeCommand.Source `
        -ArgumentList $ServerJs `
        -WorkingDirectory $PSScriptRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru

    Start-Sleep -Seconds 1
    $process.Refresh()
    if ($process.HasExited) {
        $errorLines = @()
        if (Test-Path -LiteralPath $stderrPath) {
            $errorLines = @(Get-Content -LiteralPath $stderrPath -Tail 8)
        }
        throw "Direct node process exited with code $($process.ExitCode): $($errorLines -join ' | ')"
    }

    Write-Status "Direct node state: status=running; pid=$($process.Id)"
    Assert-ServerHttpResponse
    Write-Status '[OK] Server started directly with node.exe.'
}

$scriptExitCode = 0
Write-LifecycleLog '===== start-server.ps1 begin ====='
try {
    Import-SakuraAiToken

    $pm2Path = Join-Path -Path $env:APPDATA -ChildPath 'npm\pm2.cmd'
    Write-LifecycleLog "PM2 path: $pm2Path"

    $bunPath = Join-Path -Path $env:USERPROFILE -ChildPath '.bun\bin\bun.exe'
    if (-not (Test-Path -LiteralPath $bunPath)) {
        $bunCommand = Get-Command bun.exe -ErrorAction SilentlyContinue
        if (-not $bunCommand) {
            throw 'Bunが見つかりません。Bunをインストールしてから再実行してください。'
        }
        $bunPath = $bunCommand.Source
    }
    Write-LifecycleLog "Bun path: $bunPath"

    if (Test-BuildUptodate) {
        Write-LifecycleLog 'Build artifacts are up-to-date. Skipping build.'
    }
    else {
        Write-Status 'Build state: running'
        $buildOutput = @(& $bunPath run build 2>&1)
        $buildExitCode = $LASTEXITCODE
        Write-OutputLinesToLog -Lines $buildOutput
        if ($buildExitCode -ne 0) {
            throw "Build failed with exit code $buildExitCode. See $logPath for details."
        }
        Write-Status 'Build state: succeeded'
    }

    $serverJs = Join-Path -Path $PSScriptRoot -ChildPath 'server-dist\server.js'
    if (-not (Test-Path -LiteralPath $serverJs)) {
        throw 'server-dist/server.js was not found after the build.'
    }

    if (Test-Path -LiteralPath $pm2Path) {
        Invoke-ServerWithPm2 -Pm2Path $pm2Path -ServerJs $serverJs
    }
    else {
        Invoke-ServerDirectly -ServerJs $serverJs
    }
}
catch {
    $scriptExitCode = 1
    Write-Status "[ERROR] Server start failed: $($_.Exception.Message)"
    Write-Status "[ERROR] Details: $logPath"
}
finally {
    Remove-Item Env:SAKURA_AI_TOKEN -ErrorAction SilentlyContinue
    Write-LifecycleLog "===== start-server.ps1 end (exitCode=$scriptExitCode) ====="
}

exit $scriptExitCode
