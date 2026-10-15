# プロジェクト固有の知見

共通指針と [AGENTS.md](AGENTS.md) を読んだ後、作業前にこの文書を全文読む。元の条件・確認日・未検証事項を保ったまま、固有の実現手段と再利用する知見を集約する。

## 共通指針の具体化と適用範囲

- 対象: 共通指針の「設計と実装方針」「検証」「更新手順」「ドキュメント」と、各節に明記した共通ルール。
- 理由・範囲: Bunを使い、ViteのフロントエンドとNode/Expressサーバーを別々にビルドする。共通の検証コマンドに加え、両出力と起動スクリプトの経路を確認する。
- 代替手段・検証: 以下の実効コマンド・根拠を用い、[検証記録](verification.md) で成功・未検証を区別する。共通方針の完了条件やユーザーの明示指示は弱めない。

## AGENTS.mdから移した知見

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
- Root config files such as `vite.config.mts`, `tsconfig*.json`, and `eslint.config.js` control the build, type-checking, and linting setup.

## Working Notes

- Prefer editing source files over generated output.
- Treat `frontend-dist/`, `server-dist/`, and `node_modules/` as generated or local-only directories.
- Keep changes consistent with the existing split between frontend and server code.

## 時刻入力の方針（2026-09-06確認）

- 時差変換タブの時刻入力は `timepicker-ui`（`front-src/index.html` の `#time-input`＝`type="text"` に `TimezoneComponent.setupTimePicker()` でアタッチ）を使う。24時間制アナログ文字盤・日本語ボタン（完了／キャンセル）・手入力可（`ui.editable`）で旧clockpicker相当の操作を維持する。確定時は `onConfirm` で `getValue()` を `HH:mm` に正規化してinputへ書き込み、リセット時は `setValue()` で両者を同期する（ライブラリのinput自動反映には依存しない）。
- jQuery製clockpicker（`clockpicker`、`jquery`、`@types/jquery`、`setup-jquery.ts`、動的UMDロード、`.clockpicker-*` CSS）は削除済み。再導入しない。代替に標準 `input type="time"` ではなくライブラリを使うことがユーザー指示で確定している。
- `timepicker-ui` 採用理由（2026-09-06に一次情報で確認）：MIT・ランタイム依存0（lockfileの推移依存なし）・型定義同梱・4.4.0（2026-06-10）・直近push 2026-07-07・スター97・週DL数千。open 10件はdependabot PRとv5要望のみで重大バグ放置なし。`clocklet`（2020年停止・WTFPL・DL約100/週）、`clock-timepicker`（DL約49/週・スター2）は不採用。
- ビルド後の `frontend-dist` 内の `jquery`/`jQuery` 文字列はBootstrapの受動的な `window.jQuery` 参照であり、自前のjQuery依存ではない。
- ブラウザ検証の要点：preview配信（`vite preview`はIPv6 localhostにbindするためURLは `http://localhost:<port>` を使う、`127.0.0.1` は拒否される）＋CDP。file直開きではESモジュールが動かない。ピッカーは非表示タブ内なので先に `[data-tab="timezone"]` をマウスクリックし、Enterキー投入で `.tp-ui-modal`（`role="dialog"`）の開閉を確認する。`Runtime.evaluate` が不安定な場合はDOMドメイン（querySelector/focus/getOuterHTML）と `Input.dispatchKeyEvent` だけで検証できる。

## 依存監査で確定した事項（2026-09-23）

- `bun audit fix` だけでは js-yaml、qs の脆弱版が上流の厳密な依存範囲で残る。`package.json` の既存 `overrides` と `bun.lock` を同時に更新し、`bun audit` と関連テスト・ビルドで確認する。上流が安全版を取り込んだ場合は override の必要性を再評価する。

## 開発依存監査の注意（2026-10-05）

- brace-expansion の3件のAdvisoryに対し、5系は5.0.12で該当範囲を外れる。既存親依存の5系範囲を保ち、package.jsonのoverrideとbun.lockを同時に更新する。監査の省略や閾値緩和で対応せず、CIと同じBunで固定install・監査・既存品質確認を行う。詳細はverification.md。

## メジャー更新の互換性（2026-10-12確認）

- typescript-eslint 8.71.1のpeer範囲は `>=4.8.4 <6.1.0`。TypeScript 7.0.2ではパーサーが明示的にエラーとなるため、対応範囲内の6.0.3を `~6.0.3` で使う。更新時は対応範囲と実際のlintを確認する。
- TypeScript 6のサーバー設定は `module`／`moduleResolution` ともNode16を使い、package.jsonのCommonJS既定を保つ。Vite 8は `vite.config.mts` と `build.rolldownOptions` を使う。`.ts` のESM構文をCommonJSとして読み込む設定では将来のnative loaderに関する警告が出る。
- ESLint設定が参照する `@eslint/js` は直接の開発依存とし、ESLintと同じ10系へ合わせる。両パッケージのminor番号は一致しないため、レジストリで個別に確認する。

## READMEなどから移した開発・運用情報

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | TypeScript, Vite, Bootstrap 5, Chart.js, timepicker-ui |
| バックエンド | Express (Node.js), TypeScript |
| パッケージ管理 | Bun |

## 開発

```bash
# サーバーとフロントエンドの同時ビルド
bun run build

# フロントエンドのみビルド
bun run build:frontend

# サーバーのみビルド
bun run build:server

# 本番起動
bun run start
```

サーバーは `http://localhost:65505/` で起動します。

## プロジェクト構成

```
front-src/        # フロントエンドソース（コンポーネント、スタイル、HTML）
server-src/       # サーバーソース（Express API）
frontend-dist/    # Vite ビルド出力
server-dist/      # TypeScript コンパイル出力
```

## 依存更新の自動処理

Dependabot は対象の依存関係を毎週確認します。patch／minor／major 更新は PR のチェック（CI）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗時は指定した lockfile を再生成し、CI を再実行します。コードや設定の移行が必要な更新は、手動で修正して検証します。

## 文書の役割

- [README.md](README.md): 利用開始と操作、利用者が知る必要のある制限。
- この文書: 固有の配置・ツール・実行手段・例外・再利用する調査知見。
- [verification.md](verification.md): 検証手順、実測結果、証拠、未検証事項。
- [how-to-update.md](how-to-update.md): 更新と復旧の手順。
