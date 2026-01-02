前の回答に沿ってリンク化パイプラインを可視化します。

クラス図
```mermaid
classDiagram
	class ResponseStreamWithLinkification {
		- _linkifier: ILinkifier
		- _progress: ChatResponseStream
		- _token: CancellationToken
		+ markdown()
		+ push()
		+ finalize()
	}
	class Linkifier {
		- _state: LinkifierState.State
		- _appliedText: string
		- _totalAddedLinkCount: number
		+ append()
		+ flush()
	}
	class LinkifyService {
		- globalLinkifiers: Set<IContributedLinkifierFactory>
		- envService: IEnvService
		+ registerGlobalLinkifier()
		+ createLinkifier()
	}
	class FilePathLinkifier {
		- fileSystem: IFileSystemService
		- workspaceService: IWorkspaceService
		+ linkify()
	}
```
ソース: [src/extension/linkify/common/responseStreamWithLinkification.ts](src/extension/linkify/common/responseStreamWithLinkification.ts#L13-L231), [src/extension/linkify/common/linkifier.ts](src/extension/linkify/common/linkifier.ts#L58-L307), [src/extension/linkify/common/linkifyService.ts](src/extension/linkify/common/linkifyService.ts#L79-L109), [src/extension/linkify/common/filePathLinkifier.ts](src/extension/linkify/common/filePathLinkifier.ts#L1-L86)

シーケンス図
```mermaid
sequenceDiagram
	participant User
	participant Handler as DefaultIntentRequestHandler
	participant LinkStream as ResponseStreamWithLinkification
	participant Linkifier
	participant UI as ChatResponseStream
	User->>Handler: リクエスト＋コンテキスト
	Handler->>LinkStream: Markdown を中継
	LinkStream->>Linkifier: append() でテキストを渡す
	Linkifier->>Linkifier: ModelFilePathLinkifier を適用
	Linkifier->>Linkifier: FilePathLinkifier を適用
	Linkifier-->>LinkStream: linkified なパーツを返す
	LinkStream-->>UI: アンカー付き Markdown を出力
```
ソース: [src/extension/prompt/node/defaultIntentRequestHandler.ts](src/extension/prompt/node/defaultIntentRequestHandler.ts#L234-L258), [src/extension/linkify/common/responseStreamWithLinkification.ts](src/extension/linkify/common/responseStreamWithLinkification.ts#L13-L229), [src/extension/linkify/common/linkifier.ts](src/extension/linkify/common/linkifier.ts#L58-L307), [src/extension/linkify/common/linkifyService.ts](src/extension/linkify/common/linkifyService.ts#L79-L109), [src/extension/linkify/common/filePathLinkifier.ts](src/extension/linkify/common/filePathLinkifier.ts#L1-L86), [src/extension/linkify/common/modelFilePathLinkifier.ts](src/extension/linkify/common/modelFilePathLinkifier.ts#L1-L179)
