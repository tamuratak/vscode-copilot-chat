# User
- エージェントのチャットリクエスト（ユーザ入力）からプロンプト生成、送信、LLM 応答の受信までのフローを調査するよう依頼した。
- その調査結果を元に、クラス図・シーケンス図を含む視覚的な要約を生成するよう求めた。
- 本会話の要約と図を `livind_doc/agentintent.md` に書き込むよう指示した。

# Assistant
ユーザー入力から送信・応答までの道筋は、`AgentIntent` が `EditCodeIntent` を継承して会話をエージェント用に設定し、ツールやトークン制限のオーバーライドと共に「Agent」ロケーションで処理することで始まります。[src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L126-L151)

- `getAgentTools` が使用可能工具をモデル依存・学習済み設定・実験構成・外部ツール要件で決めるため、新しいリクエストごとに必要な編集・テスト・タスクなどのツール群をフィルタリングして返します。[src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L51-L124)

- `AgentIntentInvocation.buildPrompt` ではコードベース参照、チャット変数、ツール参照、トークン予備枠をまとめ、`PromptRenderer` で実際のプロンプトを生成。バジェット超過時はサマライズを挟んで再描画し、最終的にキャッシュブレークポイントやメタデータ統合まで行った結果を返します。[src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L187-L327)

- `ChatEndpoint.createRequestBody`/`customize*` が適切な API（Responses/Messages/Completions）向けの本文を組み立て、`makeChatRequest2` が `ChatMLFetcher.fetchOne` 経由で送信してエンドポイント間でトークン予算を調整します。[src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L227-L385)

- 受信した SSE やノンストリーミング応答は `processResponseFromChatEndpoint` がモデルの対応状況に応じて正しいプロセッサ（Responses/Messages/Streaming/非ストリーム）を呼び、完了・ツール呼び出し・テレメトリを整えて上位に渡します。[src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L294-L312)

```mermaid
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
```
- note right of AgentIntent : ソース: [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L126-L327)
- note right of ChatEndpoint : ソース: [src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L112-L392)

```mermaid
sequenceDiagram
	participant ユーザ
	participant AgentIntentInvocation as エージェント意図
	participant ChatEndpoint as チャットEndpoint
	participant モデル
	ユーザ->>AgentIntentInvocation: 自然言語リクエスト
	AgentIntentInvocation->>AgentIntentInvocation: サマリ/ツール参照込みでプロンプト生成
	AgentIntentInvocation->>ChatEndpoint: リクエスト本体をビルド＆送信
	ChatEndpoint->>モデル: Responses/Messages/Completions API
	モデル-->>ChatEndpoint: SSE/非ストリーム応答
	ChatEndpoint-->>AgentIntentInvocation: ツール呼び出し・メタデータ付きで返却
	note right of AgentIntentInvocation : ソース: [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L187-L327)
	note right of ChatEndpoint : ソース: [src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L227-L385)
```

```mermaid
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
	note right of AgentIntentInvocation : ソース: [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L187-L327)
	note right of ChatEndpoint : ソース: [src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L227-L385)
```

# Files
- [src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L51-L327) - エージェント Intent におけるツール制御、プロンプト構築、キャッシュサマリ処理を担当。
- [src/platform/endpoint/node/chatEndpoint.ts](src/platform/endpoint/node/chatEndpoint.ts#L112-L392) - モデル向けリクエスト本文の組立て、エンドポイント分岐、レスポンス処理を担うチャットエンドポイント。
