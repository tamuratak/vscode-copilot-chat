## Usert

summarization の概要調査

## Assistant

概要としては、履歴の圧縮は `ConversationHistorySummarizationPrompt` から始まり、システム／ユーザー向けに細かいアウトライン（`<analysis>`＋`<summary>` セクション、直近ツールコマンドの把握、実行中の状態など）を提示するプロンプトで会話全体を要約させます。`SimpleSummarizedHistory` を使う簡易モードもあり、動的に最近のノートブック状態を付け加える `WorkingNotebookSummary` や Claude Opus 系への「ツール禁止」注意も含まれています。[src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L48-L201]

レンダリング側では `ConversationHistory` がツール実行のラウンドを逆順にたどり、要約済みラウンドがあればその要約を `SummaryMessageElement` で表示しつつ、直近のツール結果やユーザーリクエストを先頭に戻すかたちで再構成します。`SummarizedConversationHistory` は `triggerSummarize` で履歴について要約が必要だと判断したときに `ConversationHistorySummarizer` を起動し、生成された要約＋thinking を履歴／現在ラウンドに紐づけるためのメタデータを差し込みます（次ターンで継続するよう `isContinuation` を切り替えたり、ツール結果を丸めたりする）。[src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L204-L405]

実際の要約生成は `ConversationHistorySummarizer` が担い、`SummaryMode.Full` → `SummaryMode.Simple` の順にフォールバックし、設定で `Simple` 固定や GPT-4.1 強制利用（`AgentHistorySummarizationForceGpt41`）、プロンプトキャッシュの有効／無効（`AgentHistorySummarizationWithPromptCache`）という実験フラグを参照します。フルモードかつキャッシュ時は `AgentPromptWithSummaryPrompt` で通常のエージェントプロンプト＋要約要求を構築し、そうでない場合は要約専用プロンプトを直接レンダリングします。ツールを呼び出さないよう `tool_choice: 'none'` を付け、キャッシュ非対応時は `stripCacheBreakpoints` でマーカーを削除しつつ、`normalizeToolSchema` でツール定義も検証します。[src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L407-L545][src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L663-L770]

生成後はトークン予算（`maxSummaryTokens` とプロンプトサイズの min）との比較で大きすぎた場合は再試行し、成功・失敗・タイムアウトなどを `summarizedConversationHistory` イベントでテレメトリ送信します。合わせて、履歴内のラウンド数、直近ツール、ノートブック有無、継続中かどうかなどの測定値も送るため、後続の調査や分析に活用できます。[src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L548-L659]

要約対象のラウンド選定は `SummarizedConversationHistoryPropsBuilder` が担当。現在ターンの末尾ラウンドは予算超過のトリガーになるため除外し、履歴の最終ラウンドを対象としながら Anthropic の thinking ブロックや直近ランのノートブック（`ToolName.RunNotebookCell` を解析）も拾って別途 `workingNotebook` に渡します。[src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L691-L770]

要約挙動を制御する設定は `chat.advanced` ネームスペースで定義されており、履歴要約モード固定、プロンプトキャッシュの利用、GPT-4.1 強制のほか、要約トリガーとなる閾値 `SummarizeAgentConversationHistoryThreshold` を提供しています。これらを切り替えることでキャッシュ運用や要約頻度、使用モデルを調整できます。[src/platform/configuration/common/configurationService.ts#L657-L689]

次のアクション候補:
1. 必要に応じて設定（`AgentHistorySummarizationMode` 等）を変更して要約モード／モデルを調整してください。
2. まとめた要約が意図どおり出力されているか telemetry（`summarizedConversationHistory`）を確認し、必要ならログ・フィードバックを追加して精度を上げてください。