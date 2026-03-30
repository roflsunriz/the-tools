#Requires -RunAsAdministrator
#Requires -Version 5.1
<#
.SYNOPSIS
    nanase-toolbox の自動起動タスクをタスクスケジューラに登録します。
.DESCRIPTION
    ユーザーログオン時に start-server.ps1 をウィンドウ最小化状態で実行する
    スケジュールドタスク "NanaseToolboxAutoStart" を登録（または上書き）します。
.NOTES
    管理者権限が必要です。
    ExecutionPolicy が制限されている場合は事前に以下を実行してください:
      Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$taskName        = 'NanaseToolboxAutoStart'
$taskDescription = 'ユーザーログオン時に nanase-toolbox サーバーを自動起動します。'
$scriptPath      = Join-Path -Path $PSScriptRoot -ChildPath 'start-server.ps1'

if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-Error "start-server.ps1 が見つかりません: $scriptPath"
    exit 1
}

# pwsh.exe (PowerShell 7+) を優先、なければ powershell.exe にフォールバック
$pwshExe = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) {
    (Get-Command pwsh.exe).Source
} else {
    (Get-Command powershell.exe).Source
}

$taskAction = New-ScheduledTaskAction `
    -Execute $pwshExe `
    -Argument "-NoProfile -ExecutionPolicy RemoteSigned -WindowStyle Minimized -File `"$scriptPath`"" `
    -WorkingDirectory $PSScriptRoot

$taskTrigger = New-ScheduledTaskTrigger -AtLogOn

$currentUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive

Register-ScheduledTask `
    -TaskName $taskName `
    -Description $taskDescription `
    -Trigger $taskTrigger `
    -Action $taskAction `
    -Principal $taskPrincipal `
    -Force

Write-Host "タスク '$taskName' を登録/更新しました。"
Write-Host "ユーザー '$currentUser' がログオンした際に '$scriptPath' がウィンドウ最小化で実行されます。"
