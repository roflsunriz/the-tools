# AGENTS.md

## 作業開始前の必須手順（最優先・例外なし）

1. エージェントは、調査、計画、コマンド実行、スキル利用、ファイル編集、コミット、プッシュを始める前に、必ずリポジトリ直下の `.\COMMON-AGENTS.md` を開き、先頭から末尾まで全文を読む。
2. `COMMON-AGENTS.md` はGit管理外のシンボリックリンクである。`git`や既定のignore設定が有効な`rg --files`の検索結果だけで、ファイルが存在しないと判断してはならない。PowerShellでは最初に次を実行する。

```powershell
Get-Content -Raw -LiteralPath .\COMMON-AGENTS.md
```

3. 読み取りに失敗した場合、出力が省略された場合、または末尾まで読めたことを確認できない場合は、一切の作業を開始せず、パスとシンボリックリンク先を確認して全文を再取得する。必要なら分割して末尾まで読む。
4. 全文を読了するまで、ローカル `AGENTS.md` だけを根拠に作業を続けてはならない。読了後は `COMMON-AGENTS.md` を最優先の指針とし、読了直後の最初の進捗報告で全文を読了したことを明示する。
   このファイルでは `the-tools` 固有の補足だけを記載する。

## Package Manager

- Use `bun` for package management in this repository.
- Install dependencies with `bun install`.
- Run package scripts with `bun run <script>`.
- Use `bunx` for one-off CLI execution when needed.
- Do not reintroduce `package-lock.json` or `pnpm-lock.yaml`.

## Codebase Structure

- `front-src/`: frontend source code, including components, shared utilities, styles, and browser-facing type declarations.
- `server-src/`: server source code and the TypeScript entry point for the Node/Express backend.
- `frontend-dist/`: generated frontend build output from Vite.
- `server-dist/`: generated server build output from TypeScript.
- `数独/`: standalone HTML pages and local demos.
- Root config files such as `vite.config.ts`, `tsconfig*.json`, and `eslint.config.js` control the build, type-checking, and linting setup.

## Working Notes

- Prefer editing source files over generated output.
- Treat `frontend-dist/`, `server-dist/`, and `node_modules/` as generated or local-only directories.
- Keep changes consistent with the existing split between frontend and server code.

## 時刻入力の方針（2026-09-06確認）

- 時差変換タブの時刻入力は標準の `input type="time"`（`front-src/index.html` の `#time-input`、`step="60"`）を使う。`TimezoneComponent` は `HH:mm` 文字列の読み書きだけで動作するため、アナログ文字盤UIは必須ではない。
- jQuery製clockpicker（`clockpicker`、`jquery`、`@types/jquery`、`setup-jquery.ts`、動的UMDロード、`.clockpicker-*` CSS）は削除済み。再導入しない。代替ライブラリ検討時は保守性調査（直近リリース、コミット、issue/PR放置、DL/スター、ライセンス、TS型）を先に行うこと。2026年調査では `clocklet`（2020年停止・WTFPL・DL約100/週）を不採用、`clock-timepicker`（DL約49/週・スター2）を利用実績不足、`timepicker-ui`（MIT・0依存・2026-06リリース・DL数千/週）のみ保守性OKだが単一HH:mm入力には過剰、と判断し標準機能を採用した。
- ビルド後の `frontend-dist` 内の `jquery`/`jQuery` 文字列はBootstrapの受動的な `window.jQuery` 参照であり、自前のjQuery依存ではない。
