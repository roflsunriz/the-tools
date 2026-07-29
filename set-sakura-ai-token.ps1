#Requires -Version 5.1
param(
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$secretDirectory = Join-Path -Path $env:LOCALAPPDATA -ChildPath 'NanaseToolbox'
$secretPath = Join-Path -Path $secretDirectory -ChildPath 'sakura-ai-token.xml'

if ($Remove) {
    if (Test-Path -LiteralPath $secretPath) {
        Remove-Item -LiteralPath $secretPath -Force
        Write-Host '保存済みのSakura AIトークンを削除しました。'
    }
    else {
        Write-Host '保存済みのSakura AIトークンはありません。'
    }
    exit 0
}

$secureToken = Read-Host 'Sakura AIのアカウントトークンを入力してください（画面には表示されません）' -AsSecureString
if ($secureToken.Length -eq 0) {
    Write-Error 'トークンが空です。保存せず終了します。'
    exit 1
}

New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
$credential = [System.Management.Automation.PSCredential]::new('SakuraAI', $secureToken)
$credential | Export-Clixml -LiteralPath $secretPath -Force

Write-Host 'Sakura AIトークンをWindowsユーザーに紐づけて暗号化保存しました。'
Write-Host '反映するには .\stop-server.ps1 の後に .\start-server.ps1 を実行してください。'
