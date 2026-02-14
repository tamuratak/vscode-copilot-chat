## Memory Tool 概要

### 1) 記録するフォルダの場所
Memory Tool の対象パスは `/memories/*` で、実体保存先はスコープごとに分かれる。

- **ユーザーメモリ**（`/memories/...` ただし `session` と `repo` を除く）
  - 実体: `globalStorageUri/memory-tool/memories/...`
- **セッションメモリ**（`/memories/session/...`）
  - 実体: `storageUri/memory-tool/memories/<sessionId>/...`
  - `sessionId` は chat session resource から抽出した値を安全な文字に正規化して使用する
- **リポジトリメモリ**（`/memories/repo/...`）
  - ローカルファイルには保存せず、Copilot Memory (CAPI) に保存する
  - `repo` 配下は `create` のみサポート

### 2) ファイル形式
- **ローカル（user/session）**: 実装上は `file_text` をそのまま保存するため、拡張子や JSON スキーマの強制はない（任意テキスト）。
- **repo**: `create` の入力 `file_text` は JSON オブジェクト（`subject`, `fact`, `citations`, `reason`, `category`）を受け付ける。
  JSON でない場合はプレーンテキストとして受理され、`fact` に格納される。

### 3) ファイル内容の生成方法
- **ローカル create**
  `file_text` を `TextEncoder` でエンコードして、そのまま新規ファイルに書き込む。
- **ローカル更新系（str_replace / insert）**
  既存ファイルを読み込み、文字列置換または指定行への挿入で新しい本文を生成し、再書き込みする。
- **repo create**
  1. `file_text` を `JSON.parse` して `RepoMemoryEntry` を作成（不足項目はパス由来ヒントで補完）
  2. JSON パース失敗時は `fact=file_text` のエントリを作成
  3. `storeRepoMemory` で CAPI へ保存（`citations` は配列へ正規化して送信）

### 補足（repo memory の扱い）
`/memories/repo/*` は「ファイルを作る」操作名でも、実体はローカルファイルではなく repository memory API への保存である。したがって、ローカルの `memory-tool/memories/repo` を前提にした読み書きは行わない。
