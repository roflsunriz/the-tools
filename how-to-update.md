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

Sakura AI単位変換を使う場合は、初回のみSakura AIのアカウントトークンをコピーしてから次のコマンドを実行します。スクリプトは読取後にクリップボードを消去し、トークンを暗号化保存します。

```powershell
.\set-sakura-ai-token.ps1
```

## 検証

`stop-server.ps1` の後に `start-server.ps1` を2回実行し、1回目に `PM2 action: start`、2回目に `PM2 action: restart` と表示され、どちらも `status=online` と `HTTP state: ... status=200` になることを確認します。続けて `stop-server.ps1` を実行し、PM2 と直接起動した node プロセスがともに `absent` と表示されることを確認します。停止後は `start-server.ps1` を再実行して通常の起動状態へ戻します。

`start-server.log` と `stop-server.log` には、PM2 の表形式出力や `Process or Namespace nanase-toolbox not found` がなく、操作、状態、失敗理由が UTF-8 のテキストで記録されます。

最後にブラウザで `http://localhost:65505/` を開き、通貨変換とAIパラメーター単位変換の両方を確認します。AIパラメーターでは、たとえば「２．５ Ｂを億単位、小数2桁で」を入力し、「25億」と表示されることを確認します。

Sakura AIを使う最初の変換では、認証付き `GET /v1/models` からモデル一覧を取得します。ログやエラーへトークンが出ていないこと、一覧の先頭が音声・埋め込みモデルでもチャットモデルが選ばれることを `bun run test` で確認します。特定モデルを固定して検証する場合だけ `SAKURA_AI_MODEL` を設定します。

## ロールバック

更新前のGitコミットへ戻した後、`bun install` と `bun run build` を再実行してサーバーを再起動します。Sakura AIトークンだけを削除する場合は、次を実行します。

```powershell
.\set-sakura-ai-token.ps1 -Remove
```

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗時は指定した lockfile を再生成し、CI を再実行します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

## 依存脆弱性の更新

`package.json` の `overrides` は、上流パッケージが js-yaml、qs の旧版を固定している間に安全な patch 版を選ぶために使う。上流が安全版を採用したら override を減らせるか確認する。更新時は `bun install --lockfile-only --ignore-scripts`、`bun install --frozen-lockfile`、`bun audit` を実行し、該当する lint・型・テスト・ビルドを確認する。問題があれば更新コミットを revert し、lockfile と package.json を同じ版へ戻す。
