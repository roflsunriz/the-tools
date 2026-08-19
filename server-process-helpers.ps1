Set-StrictMode -Version Latest

function Initialize-Utf8Log {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
        [System.IO.File]::WriteAllText($Path, [string]::Empty, $utf8WithBom)
    }
}

function Add-Utf8LogLine {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Message
    )

    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText(
        $Path,
        $Message + [Environment]::NewLine,
        $utf8WithoutBom
    )
}

function ConvertTo-CleanCommandOutput {
    param([object[]]$Lines)

    $ansiEscapePattern = [char]27 + '\[[0-?]*[ -/]*[@-~]'
    return @(
        $Lines |
            ForEach-Object { ("$_" -replace $ansiEscapePattern, '').TrimEnd() } |
            Where-Object { $_ -ne '' }
    )
}

function Invoke-Pm2Command {
    param(
        [Parameter(Mandatory = $true)][string]$Pm2Path,
        [Parameter(Mandatory = $true)][string[]]$Pm2Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $rawOutput = @(& $Pm2Path @Pm2Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    catch {
        $rawOutput = @($_.Exception.Message)
        $exitCode = 1
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [pscustomobject]@{
        ExitCode  = $exitCode
        Output    = @(ConvertTo-CleanCommandOutput -Lines $rawOutput)
        Arguments = @($Pm2Arguments)
    }
}

function Get-Pm2CommandFailureReason {
    param([Parameter(Mandatory = $true)]$Result)

    $commandText = 'pm2 ' + ($Result.Arguments -join ' ')
    $lines = @($Result.Output | Select-Object -Last 20)
    if ($lines.Count -eq 0) {
        return "$commandText failed with exit code $($Result.ExitCode) and produced no error output."
    }

    return "$commandText failed with exit code $($Result.ExitCode): $($lines -join ' | ')"
}

function Get-Pm2DataValue {
    param(
        [Parameter(Mandatory = $true)]$InputObject,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($InputObject -is [System.Collections.IDictionary]) {
        return $InputObject[$Name]
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($property) {
        return $property.Value
    }
    return $null
}

function ConvertTo-Pm2AppSummary {
    param([Parameter(Mandatory = $true)]$App)

    $pm2Environment = Get-Pm2DataValue -InputObject $App -Name 'pm2_env'
    return [pscustomobject]@{
        Name         = Get-Pm2DataValue -InputObject $App -Name 'name'
        Pid          = Get-Pm2DataValue -InputObject $App -Name 'pid'
        Status       = Get-Pm2DataValue -InputObject $pm2Environment -Name 'status'
        RestartCount = Get-Pm2DataValue -InputObject $pm2Environment -Name 'restart_time'
        ExitCode     = Get-Pm2DataValue -InputObject $pm2Environment -Name 'exit_code'
        ScriptPath   = Get-Pm2DataValue -InputObject $pm2Environment -Name 'pm_exec_path'
        ErrorLogPath = Get-Pm2DataValue -InputObject $pm2Environment -Name 'pm_err_log_path'
    }
}

function ConvertFrom-Pm2JsonOutput {
    param([Parameter(Mandatory = $true)][string[]]$Lines)

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        $candidate = (($Lines[$index..($Lines.Count - 1)]) -join [Environment]::NewLine).Trim()
        if ($candidate -notmatch '^\[\s*(\{|\])') {
            continue
        }

        $rawApps = $null
        try {
            $convertedApps = $candidate | ConvertFrom-Json -ErrorAction Stop
            $rawApps = @()
            if ($null -ne $convertedApps) {
                $rawApps = @($convertedApps)
            }
        }
        catch {
            try {
                Add-Type -AssemblyName System.Web.Extensions -ErrorAction Stop
                $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
                $serializer.MaxJsonLength = [Math]::Max($candidate.Length * 2, 2097152)
                $deserializedApps = $serializer.DeserializeObject($candidate)
                $rawApps = @()
                if ($null -ne $deserializedApps) {
                    $rawApps = @($deserializedApps)
                }
            }
            catch {
                continue
            }
        }

        return [pscustomobject]@{
            Succeeded = $true
            Apps      = @($rawApps | ForEach-Object { ConvertTo-Pm2AppSummary -App $_ })
            Reason    = $null
        }
    }

    return [pscustomobject]@{
        Succeeded = $false
        Apps      = @()
        Reason    = 'PM2 returned output that could not be parsed as a JSON process list.'
    }
}

function Get-Pm2AppState {
    param(
        [Parameter(Mandatory = $true)][string]$Pm2Path,
        [Parameter(Mandatory = $true)][string]$AppName
    )

    $result = Invoke-Pm2Command -Pm2Path $Pm2Path -Pm2Arguments @('jlist')
    if ($result.ExitCode -ne 0) {
        return [pscustomobject]@{
            QuerySucceeded = $false
            Exists         = $false
            Name           = $AppName
            Status         = $null
            Pid            = 0
            RestartCount   = 0
            ExitCode       = $null
            ScriptPath     = $null
            ErrorLogPath   = $null
            FailureReason  = Get-Pm2CommandFailureReason -Result $result
        }
    }

    $parsed = ConvertFrom-Pm2JsonOutput -Lines @($result.Output)
    if (-not $parsed.Succeeded) {
        return [pscustomobject]@{
            QuerySucceeded = $false
            Exists         = $false
            Name           = $AppName
            Status         = $null
            Pid            = 0
            RestartCount   = 0
            ExitCode       = $null
            ScriptPath     = $null
            ErrorLogPath   = $null
            FailureReason  = $parsed.Reason
        }
    }

    $app = @($parsed.Apps | Where-Object { $_.Name -eq $AppName } | Select-Object -First 1)
    if ($app.Count -eq 0) {
        return [pscustomobject]@{
            QuerySucceeded = $true
            Exists         = $false
            Name           = $AppName
            Status         = 'absent'
            Pid            = 0
            RestartCount   = 0
            ExitCode       = $null
            ScriptPath     = $null
            ErrorLogPath   = $null
            FailureReason  = $null
        }
    }

    $process = $app[0]
    return [pscustomobject]@{
        QuerySucceeded = $true
        Exists         = $true
        Name           = $process.Name
        Status         = $process.Status
        Pid            = [int]$process.pid
        RestartCount   = [int]$process.RestartCount
        ExitCode       = $process.ExitCode
        ScriptPath     = $process.ScriptPath
        ErrorLogPath   = $process.ErrorLogPath
        FailureReason  = $null
    }
}

function Format-Pm2AppState {
    param([Parameter(Mandatory = $true)]$State)

    if (-not $State.QuerySucceeded) {
        return "PM2 state unavailable: $($State.FailureReason)"
    }
    if (-not $State.Exists) {
        return "PM2 state: name=$($State.Name); status=absent"
    }

    $lastExitCode = $State.ExitCode
    if ($null -eq $lastExitCode -or "$lastExitCode" -eq '') {
        $lastExitCode = 'n/a'
    }
    return "PM2 state: name=$($State.Name); status=$($State.Status); pid=$($State.Pid); restarts=$($State.RestartCount); lastExitCode=$lastExitCode"
}

function Wait-Pm2AppState {
    param(
        [Parameter(Mandatory = $true)][string]$Pm2Path,
        [Parameter(Mandatory = $true)][string]$AppName,
        [Parameter(Mandatory = $true)][ValidateSet('online', 'absent')][string]$ExpectedStatus,
        [int]$TimeoutSeconds = 8
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $state = $null
    do {
        $state = Get-Pm2AppState -Pm2Path $Pm2Path -AppName $AppName
        if ($state.QuerySucceeded) {
            if ($ExpectedStatus -eq 'online' -and $state.Exists -and $state.Status -eq 'online') {
                return $state
            }
            if ($ExpectedStatus -eq 'absent' -and -not $state.Exists) {
                return $state
            }
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    return $state
}

function Get-Pm2ErrorLogSummary {
    param(
        [AllowNull()][string]$Path,
        [int]$Tail = 8
    )

    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    try {
        return @(
            Get-Content -LiteralPath $Path -Tail $Tail -ErrorAction Stop |
                ForEach-Object { "$($_.TrimEnd())" } |
                Where-Object { $_ -ne '' }
        )
    }
    catch {
        return @("Could not read PM2 error log '$Path': $($_.Exception.Message)")
    }
}

function Wait-ServerHttpResponse {
    param(
        [Parameter(Mandatory = $true)][uri]$Uri,
        [int]$TimeoutSeconds = 8
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastReason = 'No request was attempted.'
    do {
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 2
            return [pscustomobject]@{
                Succeeded     = $true
                StatusCode    = [int]$response.StatusCode
                FailureReason = $null
            }
        }
        catch {
            $lastReason = $_.Exception.Message
            Start-Sleep -Milliseconds 500
        }
    } while ((Get-Date) -lt $deadline)

    return [pscustomobject]@{
        Succeeded     = $false
        StatusCode    = $null
        FailureReason = $lastReason
    }
}
