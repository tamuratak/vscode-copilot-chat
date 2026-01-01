**User**

ユーザー要求のまとめ:

- `showChatLogView` がどのように実装されているかを徹底的に調査すること。
- 調査結果をこのドキュメント (`living_doc/chatdebugview.md`) にまとめること（`savesession.prompt.md` の指示に従う）。

**Assistant**

要約:

- **コマンド実行フロー:** `github.copilot.debug.showChatLogView` を実行すると、`ContextKeysContribution` 側で内部フラグ `_showLogView` を `true` にし、`commands.executeCommand('setContext', 'github.copilot.chat.showLogView', true)` を呼び出します。その後 `copilot-chat.focus` を実行してデバッグ用ビューを前面に出します。
- **コマンド登録箇所:** `ContextKeysContribution` クラス内でコマンドを登録しています（該当箇所の登録コード参照）。
- **ビューの寄与設定:** `package.json` の `views` 貢献で `copilot-chat` ビュー（表示名: "Chat Debug"）が定義され、表示条件は `github.copilot.chat.showLogView` コンテキストです。これによりコンテキストが true のとき Activity Bar にビューが現れます。
- **ビューの実装（提供者）:** `RequestLogTree` クラスが `copilot-chat` に対して `TreeDataProvider` を登録し、`IRequestLogger` から取得したログを `ChatPromptItem` / `ChatRequestItem` / `ToolCallItem` / `ChatElementItem` としてツリー表示します。HTML を簡易ブラウザで見るためのルータ、Markdown/JSON/アーカイブのエクスポート、現在の Markdown を保存するコマンド、出力チャネル表示コマンドなど、多数のデバッグ用コマンドを登録しています。
- **フィルタと設定保存:** `LogTreeFilters` と `LogTreeFilterCommands` が要素・ツール・NES・Ghost などのフィルタ表示を管理し、workspaceState に設定を保存、関連するコンテキストも更新します。
- **自動有効化条件:** `ContextKeysContribution._updateShowLogViewContext()` は、拡張が内部向けトークンを持つか非プロダクション環境であれば `_showLogView` を有効化し、ビューを表示状態にします。
- **関連操作のトリガ:** `package.json` 側でチャットパネルのタイトルメニューにも `github.copilot.debug.showChatLogView` を追加しており、チャットパネルからもデバッグビューを開けます。

Mermaid ダイアグラム: なし（本セッションで生成された mermaid 図はありません）

参照ファイル一覧:

- **Context keys 実装:** [src/extension/contextKeys/vscode-node/contextKeys.contribution.ts](src/extension/contextKeys/vscode-node/contextKeys.contribution.ts#L62-L66) — `github.copilot.debug.showChatLogView` コマンド登録と `setContext` 実行箇所。
- **Show log view 更新:** [src/extension/contextKeys/vscode-node/contextKeys.contribution.ts](src/extension/contextKeys/vscode-node/contextKeys.contribution.ts#L186-L194) — `_updateShowLogViewContext()` による自動有効化ロジック。
- **ビュー寄与定義:** [package.json](package.json#L4665-L4671) — `views` で `copilot-chat` が `github.copilot.chat.showLogView` のとき表示される定義。
- **ビュータイトルメニュー登録箇所:** [package.json](package.json#L4234-L4254) — `view/title` に `github.copilot.debug.showChatLogView` を追加している箇所。
- **ログツリー実装:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L33-L45) — `RequestLogTree` のコマンド定義と `TreeDataProvider` 登録。
- **ログツリーの主要クラス:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L760-L818) — `ChatRequestItem` 等の TreeItem 実装。
- **フィルタ実装:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L820-L830) — `LogTreeFilters` の初期化、設定保存ロジック。

必要なら、このドキュメントをベースに「実行手順（コマンド実行例）」や「デバッグ時に確認すべきログ項目」のチェックリストを追記します。
