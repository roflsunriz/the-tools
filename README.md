# ツールボックス

個人用ウェブツール集。Express + Vite + TypeScript で構築されたオールインワンのユーティリティアプリケーション。

## 使い方

### 初回セットアップ

```powershell
# 依存関係をインストール
bun install

# （管理者 PowerShell）ログオン時にサーバーを自動起動するタスクを登録
Register-NanaseToolboxTask.ps1
```

### 起動／停止

```powershell
# 手動でサーバーを起動（ビルド → PM2/直接起動）
.\start-server.ps1

# サーバーを停止（PM2 プロセス削除 + node プロセス停止）
.\stop-server.ps1
```

サーバーは `http://localhost:65505/` で起動します。  
`Register-NanaseToolboxTask.ps1` を実行しておけば、ログオン時に自動で起動します。

## 機能一覧

- **数値変換** — 通貨換算（USD ⇄ JPY）とAIパラメーター単位変換
- **為替レート** — リアルタイムの USD/JPY レート表示
- **ニコニコID** — テキストからニコニコ動画 ID を抽出
- **時差変換** — 複数タイムゾーン間の時刻変換
- **充電時間** — バッテリー充電時間の計算
- **ストーブ計算** — 燃料・ストーブの燃焼時間と湯沸かし計算
- **アラーム** — 指定時刻に音楽ファイルを再生
- **ミニマムJSON** — JSON のキー短縮・minify によるトークン削減
- **価格推移** — [kakaku.com](https://kakaku.com) の価格推移グラフ表示（サーバーサイドプロキシ経由）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | TypeScript, Vite, Bootstrap 5, Chart.js, jQuery |
| バックエンド | Express (Node.js), TypeScript |
| パッケージ管理 | Bun |

## セットアップ

```bash
bun install
```

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

## プライベートリポジトリ

このリポジトリは個人利用を目的としたプライベートプロジェクトです。外部からのコントリビューションは受け付けていません。
