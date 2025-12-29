## User

- agent の prompt のキャッシュのヒット率の向上、ヒット率のチェックなどを実装しているコードを調査して
- prompt のキャッシュのヒットに関して議論しているドキュメント・コメントがあるか探して

## Assistant

- `cacheBreakpoints.ts` に書かれたプロンプト構造／キャッシュブレークポイント戦略のコメント（[src/extension/intents/node/cacheBreakpoints.ts](src/extension/intents/node/cacheBreakpoints.ts#L11-L78)）は、「ツール結果→ユーザー→履歴」の順に4つの境界を貼ることで毎ターンにヒットを狙い、ターン頭でのミス、直後のアシスタントメッセージ、現在のツール結果といった必然的な再利用ポイントを作り出していると明示しています。`AgentIntent` で summarization が有効なら `enableCacheBreakpoints` を true にして `PromptRenderer` に渡し（[src/extension/intents/node/agentIntent.ts](src/extension/intents/node/agentIntent.ts#L215-L307)）、予算オーバー時はまとめて再レンダー→失敗時はブレークポイントを外して fallback するロジックも入れてあるので、エージェントプロンプトへヒット率向上＋安全装置が組み込まれています。
- 会話履歴要約周りでは `ConversationHistorySummarizer` が `AgentHistorySummarizationWithPromptCache` フラグでフルモード／キャッシュ付きの `AgentPromptWithSummaryPrompt` をレンダリングし（[src/extension/prompts/node/agent/summarizedConversationHistory.tsx](src/extension/prompts/node/agent/summarizedConversationHistory.tsx#L412-L545)）、キャッシュ時は `addCacheBreakpoints`、それ以外は `stripCacheBreakpoints` を呼んで境界の差し替え、さらに `sendSummarizationTelemetry` で `promptCacheTokenCount` を含む計測値を送る（同ファイル #L548-L659）ことで「キャッシュに載ったトークン数＝ヒット量」のログも取れるようになっています。分類のための telemetry コメントや `promptCacheMode` を伴う endpoint の選別が記録されており、hit/miss の判定条件とトレースが整備されています。
- モデル／サーバー側の統計でも `ChatMLFetcherTelemetrySender` が `response.success` イベントで `promptCacheTokenCount` を送信（[src/extension/prompt/node/chatMLFetcherTelemetry.ts](src/extension/prompt/node/chatMLFetcherTelemetry.ts#L60-L149)）しており、SummarizedTelemetry と合わせてキャッシュヒット量のトラッキングが実装済みです。`test/base/cachingChatMLFetcher.ts`（[test/base/cachingChatMLFetcher.ts](test/base/cachingChatMLFetcher.ts#L96-L202)）は `isCacheHit`/`cacheMetadata` を付与し、`CacheMode.Require` で misses を即エラーにすることでシミュレーション中でもヒット率チェックが強制されますし、`test/simulation/workbench/components/request.tsx`（[test/simulation/workbench/components/request.tsx](test/simulation/workbench/components/request.tsx#L102-L123)）は UI に hit/miss と元の時間を表示して目視確認できるようになっています。
- ドキュメント側では `living_doc/summarization.md`（[living_doc/summarization.md](living_doc/summarization.md#L7-L17)）がプロンプトキャッシュフラグやブレークポイントの有効化/無効化を言及し、`living_doc/agentintent.md` と `living_doc/loop.md`（それぞれ [living_doc/agentintent.md](living_doc/agentintent.md#L82-L104)／[living_doc/loop.md](living_doc/loop.md#L81-L119)）のシーケンス図で「ツールトークン→要約→Cache Breakpoints付きレンダリング」という流れを説明しているため、ヒット率改善がコード＋設計ドキュメント双方で追跡されています。

次のアクション候補:
1. `simulate`/workbench を使って `isCacheHit` や `cacheMetadata` を出力し、想定どおりキャッシュヒット率が上昇しているか公式レポートのスクリーンショットやログで確認する。
2. `summarizedConversationHistory` および `response.success` イベントの telemetry を観察し、`promptCacheTokenCount` の増減でキャッシュ活用状況を把握する。
3. `AgentHistorySummarizationWithPromptCache` 設定を切り替えて、`addCacheBreakpoints` の挙動／fallback パスが意図どおりに働くかをデバッグセッションで試す。
