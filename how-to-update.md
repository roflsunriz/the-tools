# 更新手順

## 前提

- PowerShell 5.1以上
- Bun 1.3.8
- Node.js

## 更新

```powershell
bun install
bun run lint
bun run type-check
bun run test
bun run build
.\stop-server.ps1
.\start-server.ps1
```

Sakura AI単位変換を使う場合は、初回のみ次のコマンドでアカウントトークンを暗号化保存します。

```powershell
.\set-sakura-ai-token.ps1
```

## 検証

ブラウザで `http://localhost:65505/` を開き、通貨変換とAIパラメーター単位変換の両方を確認します。AIパラメーターでは、たとえば「２．５ Ｂを億単位、小数2桁で」を入力し、「25億」と表示されることを確認します。

## ロールバック

更新前のGitコミットへ戻した後、`bun install` と `bun run build` を再実行してサーバーを再起動します。Sakura AIトークンだけを削除する場合は、次を実行します。

```powershell
.\set-sakura-ai-token.ps1 -Remove
```
