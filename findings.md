# 調査知見

- 時差変換の入力は `timepicker-ui` をtext inputへ付け、`onConfirm` で `HH:mm` を明示反映、reset時も `setValue()` とinputを同期する。ライブラリの自動反映へ依存しない。旧jQuery clockpickerや標準 `input type=time` へ戻さない。
- Vite previewはIPv6 localhostへbindする環境があり、`127.0.0.1` が拒否される。検証URLは `http://localhost:<port>` を使い、ES moduleが動かないfile直開きを避ける。
- timepickerは非表示tab内にあるため先にtimezone tabを実クリックする。CDPの `Runtime.evaluate` が不安定ならDOM domainと `Input.dispatchKeyEvent` で確認できる。bundle内の `jQuery` 文字列はBootstrapの受動参照で、依存復活の証拠ではない。
- frontendとExpress serverは別々に生成されるため、両outputと起動経路を確認する。serverのTS設定はNode16/CommonJS、Vite設定は `.mts` と `build.rolldownOptions` を保つ。
- TypeScript 7はtypescript-eslint非対応のため6系を維持する。間接依存の監査修正はoverrideとlockfileを同時更新し、上流解消後はoverrideを外す。
- 2026-10-31の監査修正ではbody-parser、qs、minimatch、serialize-javascriptを更新し、サーバーとフロントエンドのbuild、ローカルの通貨変換と時刻選択を確認した。
