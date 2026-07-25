# Changelog

このプロジェクトの主な変更はこのファイルに記録します。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に従います。

## [Unreleased]

### Security

- push前監査で検出された既知の依存脆弱性を解消するため、安全版へ依存関係とロックファイルを更新した。

### Changed

- 作業開始時の共通指針見落としを防ぐため、調査やコマンド実行より前に `COMMON-AGENTS.md` を先頭から末尾まで読み、EOFを確認する必須ゲートを追加した。

### Added

- CodexリセットAPIから取得したリセットクレジットのexpire dateをリアルタイム表示するタブを追加。
