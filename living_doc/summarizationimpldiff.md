## User

summarization の概要調査：
- chat session の summarization 実装は gemini や gpt など LLM の違いに応じて実装に違いがあるか
- 特定の LLM でだけ不具合が起こることはあるか

## Assistant

概要:

- 履歴要約は共通パイプラインで動作します。表示／レンダリングは `ConversationHistorySummarizationPrompt`／`SummarizedConversationHistory` 側で組み立てられ、実際の要約生成は `ConversationHistorySummarizer` が担当します。
- 要約はまず `SummaryMode.Full` を試し、失敗した場合に `SummaryMode.Simple`（`SimpleSummarizedHistory`）へフォールバックします。
- モデル固有の差分は最小限で、主に以下の例外処理があります。
  - Claude Opus 系（`claude-opus`）を検知した場合、プロンプトに「ツールを呼ばないで」という注意を追加する（ツール呼び出しを避けるため）。
  - Anthropic 系（thinking ブロックを持つモデル）については、要約後に思考（thinking）ブロックを復帰させる処理が入る。
  - Simple モードで GPT‑4.1 系に合わせたリマインダーを付与する（`DefaultOpenAIKeepGoingReminder`）。
- モデル選択や強制は設定で制御可能：`chat.advanced.agentHistorySummarizationForceGpt41` など。プロンプトキャッシュや要約閾値も設定で切替可能。

不具合やモデル依存の挙動:

- 実装は単一の要約経路を使っており、特定モデル専用の大きな別実装はありません。よって「特定の LLM だけでしか起きない」不具合は少ない想定です。
- ただし実務的に問題になるパターンは存在します:
  - モデル切替によりコンテキストウィンドウが小さくなった場合、Full モードのレンダリング／送信が失敗して Simple モードへフォールバックする（結果が粗くなる）。
  - モデル固有のフィルタやトークン制限でリクエストが拒否されるケース（このときは telemetry に失敗理由が残る）。
- 解析・診断はテレメトリイベント `summarizedConversationHistory` を使うと良い（成功/失敗、使用モデル、モード、トークン数、直近ツールなどを送信する）。

実装上の注目ポイント（技術的）:

- 要約時は `tool_choice: 'none'` を付けてツール実行を抑止する（Full モード時）。
- プロンプトキャッシュを使うか否かでレンダリング経路が変わる（`AgentPromptWithSummaryPrompt` を使うか `ConversationHistorySummarizationPrompt` を直接使うか）。
- 要約サイズは `maxSummaryTokens` とレンダリング側のトークン予算でチェックし、オーバーしたら再試行やフォールバックを行う。

次のアクション候補:

1. `summarizedConversationHistory` テレメトリを確認し、モデル別の成功率／フォールバック頻度を調査する。
2. 必要なら `chat.advanced.agentHistorySummarizationForceGpt41` や `chat.advanced.agentHistorySummarizationMode` を試験的に切り替え、特定モデルでの信頼性を向上させる。

## Mermaid diagrams

セッション中に生成された mermaid 図はありません。

## 参照ファイル一覧

- src/extension/prompts/node/agent/summarizedConversationHistory.tsx — 要約レンダリング、SummarizedConversationHistory、ConversationHistorySummarizer の実装
- src/extension/prompts/node/agent/simpleSummarizedHistoryPrompt.tsx — フォールバック用の簡易要約（SimpleSummarizedHistory）
- src/extension/prompt/node/summarizer.ts — `ChatSummarizerProvider`（チャット要約提供インターフェース）
- src/platform/configuration/common/configurationService.ts — 要約まわりの設定（`AgentHistorySummarizationForceGpt41` 等）
