# User

- エージェントがループに落ちるのを防ぐ仕組みが実装されているか徹底的に調査してほしい。
- 特に「tool call の結果がエラーではないがほぼ中身がなく役に立たない → 全く同じ tool call を再度呼ぶ → ループする」ケースを自動的に防ぐ仕組みがあるか確認してほしい。

# Assistant

概要:
- 調査の結果、既存の仕組みは主に呼び出し回数と入力検証のリトライ制御に基づくもので、"同一の有効だが中身が空なツール結果" を検出して自動的に停止する専用ロジックは存在しません。

詳細ポイント:
- ループ上限: `ToolCallingLoop` が `toolCallLimit` を監視し、上限到達時にループを停止する。`ToolCallLimitBehavior.Confirm` を設定するとストリーム上で「Continue（継続）」確認を表示し、ユーザー選択で上限を延長できる（`copilotRequestedRoundLimit` を付与）。
	- 参照: [src/extension/intents/node/toolCallingLoop.ts](src/extension/intents/node/toolCallingLoop.ts)
- デフォルト設定: `DefaultIntentRequestHandler` はデフォルトで `maxToolCallIterations`（既定 15）を使用し、`AgentIntent` は `getRequestedToolCallIterationLimit` → `chat.agent.maxRequests`（既定 200）で上限を決める。
	- 参照: [src/extension/prompt/node/defaultIntentRequestHandler.ts](src/extension/prompt/node/defaultIntentRequestHandler.ts)
	- 参照: [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts)
	- 参照: [src/extension/intents/common/agentConfig.ts](src/extension/intents/common/agentConfig.ts)
- 入力検証リトライ: ツール入力検証エラーがある場合は `toolInputRetry` をカウントし、表示側（UI）で `MAX_INPUT_VALIDATION_RETRIES`（5回）を超えると再実行を抑止する仕組みがある。ただしこれは「入力が無効だった場合」の制御であり、ツール結果が空だがエラーにならないケースは含まれない。
	- 参照: [src/extension/prompts/node/panel/toolCalling.tsx](src/extension/prompts/node/panel/toolCalling.tsx)
- ループ（応答重複）検知: `ChatMLFetcher` が応答中の繰り返し行数やトークンの重複を検出して `conversation.repetition.detected` テレメトリを送信するが、これも停止を行うものではなく診断用である。
	- 参照: [src/extension/prompt/node/chatMLFetcher.ts](src/extension/prompt/node/chatMLFetcher.ts)

結論:
- 「同一ツールを繰り返し呼んで中身がほぼ空の結果が返る」ことで起きる無限ループを自動的に検出して即座に止める実装は現状存在しない。現行の防止は回数制限（呼び出し回数上限）と入力検証リトライ回数による間接的な抑止に頼っている。

推奨対応（運用・設計両面）:
- 運用: `chat.agent.maxRequests` や `maxToolCallIterations` を低めに設定して早期に停止させる。テレメトリ `conversation.repetition.detected` を監視して問題を検出する。
- 設計: 復帰案として以下の対策を検討する。
	- 直近 N 回のツール呼び出し（同じツール名・引数）とその結果内容を比較し、結果が空/無意味（閾値以下）なら自動で再呼び出しを停止してユーザー確認に移すロジックを追加する。
	- ツール結果が「空」だった場合にも `toolInputRetry` を増やして UI 側の `MAX_INPUT_VALIDATION_RETRIES` により早期停止させる仕組みをサーバ側で一貫して管理する。
	- 応答重複検知（既存のテレメトリ）をリアルタイム判定に拡張し、一定の繰り返しが検出されたらループ終了をトリガーする。

Mermaid 図（会話中に生成した図）:

classDiagram
		class EditCodeIntent {
				+buildPrompt()
		}
		class AgentIntent {
				+id: string
				+getIntentHandlerOptions()
		}
		class EditCodeIntentInvocation {
				+buildPrompt()
		}
		class AgentIntentInvocation {
				-prompt: AgentPrompt/InlinePrompt
				-extraPromptProps: Partial<AgentPromptProps>
				-_resolvedCustomizations: AgentPromptCustomizations | undefined
				-logService: ILogService
				+getAvailableTools()
				+buildPrompt()
				+modifyErrorDetails()
				+getAdditionalVariables()
		}
		class ChatEndpoint {
				-_maxTokens: number
				-_maxOutputTokens: number
				-_supportsStreaming: boolean
				-_policyDetails: ModelPolicy | undefined
				+model: string
				+family: string
				+supportsToolCalls: boolean
				+getExtraHeaders()
				+createRequestBody()
				+interceptBody()
				+processResponseFromChatEndpoint()
				+makeChatRequest2()
				+cloneWithTokenOverride()
		}
		class RemoteAgentChatEndpoint {
				-_requestMetadata: RequestMetadata
				+processResponseFromChatEndpoint()
				+urlOrRequestMetadata()
		}
		EditCodeIntent <|-- AgentIntent
		EditCodeIntentInvocation <|-- AgentIntentInvocation
		ChatEndpoint <|-- RemoteAgentChatEndpoint


sequenceDiagram
		participant ユーザ
		participant AgentIntentInvocation as エージェント意図
		participant ChatEndpoint as チャットEndpoint
		participant モデル
		ユーザ->>AgentIntentInvocation: 自然言語リクエスト
		AgentIntentInvocation->>AgentIntentInvocation: サマリ/ツール参照込みでプロンプト生成
		AgentIntentInvocation->>ChatEndpoint: リクエスト本体をビルド＆送信
		ChatEndpoint->>モデル: Responses/Messages/Completions API
		モデル-->>ChatEndpoint: SSE/非ストリーミング応答
		ChatEndpoint-->>AgentIntentInvocation: ツール呼び出し・メタデータ付きで返却


sequenceDiagram
		participant ユーザ
		participant AgentIntentInvocation as エージェント意図
		participant PromptRenderer as プロンプトレンダー
		participant ChatEndpoint as チャットEndpoint
		participant ChatMLFetcher as ChatMLFetcher
		participant モデル
		ユーザ->>AgentIntentInvocation: ユーザー入力と参照
		AgentIntentInvocation->>PromptRenderer: ツールトークン→サマリ→Cache Breakpoints付きでrender
		PromptRenderer-->>AgentIntentInvocation: RenderPromptResult
		AgentIntentInvocation->>ChatEndpoint: メッセージ配列の作成＆interceptBody
		ChatEndpoint->>ChatMLFetcher: fetchOne（Responses/Messages/Completions）
		ChatMLFetcher->>モデル: HTTPリクエスト
		モデル-->>ChatMLFetcher: SSEまたはJSON応答
		ChatMLFetcher-->>ChatEndpoint: AsyncIterable<ChatCompletion>
		ChatEndpoint-->>AgentIntentInvocation: processResponseFromChatEndpoint()


参照ファイル（会話で確認した主な箇所）:
- [src/extension/intents/node/toolCallingLoop.ts](src/extension/intents/node/toolCallingLoop.ts) — ツール呼び出しループ本体、`toolCallLimit` と上限到達時の確認表示処理。
- [src/extension/prompt/node/defaultIntentRequestHandler.ts](src/extension/prompt/node/defaultIntentRequestHandler.ts) — リクエストハンドラ、デフォルトの `maxToolCallIterations` とループ起動・終了の統合。
- [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts) — エージェント用の上限決定ロジックとツール選定。
- [src/extension/intents/common/agentConfig.ts](src/extension/intents/common/agentConfig.ts) — `chat.agent.maxRequests` の取得（既定値）。
- [src/extension/prompt/common/specialRequestTypes.ts](src/extension/prompt/common/specialRequestTypes.ts) — `copilotRequestedRoundLimit`／確認データの判定ユーティリティ。
- [src/extension/prompt/node/chatMLFetcher.ts](src/extension/prompt/node/chatMLFetcher.ts) — 応答の繰り返し（ループ）検知とテレメトリ送信。
- [src/extension/prompts/node/panel/toolCalling.tsx](src/extension/prompts/node/panel/toolCalling.tsx) — ツール呼び出しレンダリング、`toolInputRetry` と `MAX_INPUT_VALIDATION_RETRIES` の使用箇所。

