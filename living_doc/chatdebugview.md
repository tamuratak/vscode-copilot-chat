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
- **Copilot Markdown 表示:** `ChatRequestScheme` が `ccreq` スキームで `.copilotmd` / `.json` / `.request.json` URI を組み立て・解析・リンク抽出し、`RequestLogger` 実装が `workspace.registerTextDocumentContentProvider` で Markdown/JSON/Raw request を返す（Markdown は `_renderRequestToMarkdown` / `_renderToolCallToMarkdown` 経由）と同時に `output` ビュー向けに `ChatRequestScheme.findAllUris` を使ったリンクプロバイダーを登録する。`RequestLogTree` のコマンドや TreeItem は `ChatRequestScheme.buildUri` で生成した `ccreq` URI を `vscode.open` に渡すことでそのまま `.copilotmd` を表示・保存・エクスポートできる。

Mermaid ダイアグラム: なし（本セッションで生成された mermaid 図はありません）

**Copilot Markdown 表示の実装**

`ChatRequestScheme` は `ccreq` をプリフィックスとし、`buildUri` で「latest」/個別エントリの `.copilotmd`・`.json`・`.request.json` を組み立て、`parseUri` で逆に解釈し、`findAllUris` でテキスト中の `ccreq` リンクを検索する [src/platform/requestLogger/node/requestLogger.ts](src/platform/requestLogger/node/requestLogger.ts#L25-L91)。

`RequestLogger` 実装 (`RequestLogger` クラス) は `workspace.registerTextDocumentContentProvider` で `ChatRequestScheme.chatRequestScheme` を登録し、URI のフォーマットに応じて Markdown / JSON / raw request を返す。Markdown では `_renderRequestToMarkdown` や `_renderToolCallToMarkdown` で人間向けに整形し、`addEntry` で新規エントリを保持するたびに `ChatRequestScheme.buildUri` をログに出力して `ccreq` を参照可能にしている [src/extension/prompt/vscode-node/requestLoggerImpl.ts](src/extension/prompt/vscode-node/requestLoggerImpl.ts#L251-L422)。同ファイルの `_ensureLinkProvider` は `ChatRequestScheme.findAllUris` を使って `output` ドキュメント上の `ccreq` テキストを DocumentLink に変換し、`output` ビューからでも `.copilotmd` を開けるようにしている [src/extension/prompt/vscode-node/requestLoggerImpl.ts](src/extension/prompt/vscode-node/requestLoggerImpl.ts#L401-L422)。

`RequestLogTree` は 1) `exportLogItem` / `saveCurrentMarkdown` / `showRawRequestBody` などのコマンドで `ChatRequestScheme.buildUri` から取得した仮想 URI を `vscode.workspace.openTextDocument` で読み込み、2) `ChatPromptItem` / `ToolCallItem` / `ChatRequestItem` の `command` に `vscode.open` を設定してツリーからそのまま `.copilotmd` を表示できるようにしている [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L120-L260) [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L716-L815)。

参照ファイル一覧:

- **Context keys 実装:** [src/extension/contextKeys/vscode-node/contextKeys.contribution.ts](src/extension/contextKeys/vscode-node/contextKeys.contribution.ts#L62-L66) — `github.copilot.debug.showChatLogView` コマンド登録と `setContext` 実行箇所。
- **Show log view 更新:** [src/extension/contextKeys/vscode-node/contextKeys.contribution.ts](src/extension/contextKeys/vscode-node/contextKeys.contribution.ts#L186-L194) — `_updateShowLogViewContext()` による自動有効化ロジック。
- **ビュー寄与定義:** [package.json](package.json#L4665-L4671) — `views` で `copilot-chat` が `github.copilot.chat.showLogView` のとき表示される定義。
- **ビュータイトルメニュー登録箇所:** [package.json](package.json#L4234-L4254) — `view/title` に `github.copilot.debug.showChatLogView` を追加している箇所。
- **ログツリー実装:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L33-L45) — `RequestLogTree` のコマンド定義と `TreeDataProvider` 登録。
- **ログツリーの主要クラス:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L760-L818) — `ChatRequestItem` 等の TreeItem 実装。
- **フィルタ実装:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L820-L830) — `LogTreeFilters` の初期化、設定保存ロジック。
- **Copilot Markdown スキーム:** [src/platform/requestLogger/node/requestLogger.ts](src/platform/requestLogger/node/requestLogger.ts#L25-L91) — `ChatRequestScheme` による `ccreq` URI の構築・解析・リンク検索。
- **Markdown プロバイダー:** [src/extension/prompt/vscode-node/requestLoggerImpl.ts](src/extension/prompt/vscode-node/requestLoggerImpl.ts#L251-L422) — `workspace.registerTextDocumentContentProvider` による `.copilotmd` / `.json` / `rawrequest` の返却。
- **リンクプロバイダー:** [src/extension/prompt/vscode-node/requestLoggerImpl.ts](src/extension/prompt/vscode-node/requestLoggerImpl.ts#L401-L422) — `output` 上の `ccreq` を `DocumentLink` としてクリック可能にする。
- **コマンドとツリーからの表示:** [src/extension/log/vscode-node/requestLogTree.ts](src/extension/log/vscode-node/requestLogTree.ts#L120-L260) — `exportLogItem` / `saveCurrentMarkdown` 等で `ChatRequestScheme` を使って仮想 URI から `.copilotmd` を読み込み、ツリーの `ChatPromptItem` / `ToolCallItem` / `ChatRequestItem` が `vscode.open` で `ccreq` を表示。

必要なら、このドキュメントをベースに「実行手順（コマンド実行例）」や「デバッグ時に確認すべきログ項目」のチェックリストを追記します。
