# このスクリプトは管理者権限で実行する必要があります。
# スクリプトの実行が禁止されている場合、先に以下のコマンドを実行してください:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# --- スクリプトここから ---

# スクリプトが置かれているディレクトリのパスを取得
$scriptDirectory = $PSScriptRoot

# 実行するバッチファイルのフルパスを組み立て
$batPath = Join-Path -Path $scriptDirectory -ChildPath "start-server.bat"

# タスクスケジューラに登録する設定
$taskName = "AutoToolStart"
$taskDescription = "ユーザーログオン時に自動でツールボックスを起動します。"
$taskTrigger = New-ScheduledTaskTrigger -AtLogOn
$taskAction = New-ScheduledTaskAction -Execute $batPath -WorkingDirectory $scriptDirectory

# 現在のユーザーでタスクを実行するように設定
$taskPrincipal = New-ScheduledTaskPrincipal -UserId (Get-CimInstance -ClassName Win32_ComputerSystem).UserName -LogonType Interactive

# タスクを登録（または上書き）
# -Force パラメータで、同名のタスクがあれば上書きします
Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Trigger $taskTrigger -Action $taskAction -Principal $taskPrincipal -Force

Write-Host "タスク '$taskName' を登録/更新しました。"
Write-Host "ユーザー '$($taskPrincipal.UserId)' がログオンした際に '$batPath' が実行されます。"
