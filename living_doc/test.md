**テスト構成**
- Node 22.x、Python 3.10～3.12、Git LFS が必須で、`npm install` → `npm run get_token` などの初期セットアップの後、ウォッチタスク（`npm run watch:*`）を動かしてコンパイル出力を常に確認する運用が推奨されています。[CONTRIBUTING.md#L67-L140](CONTRIBUTING.md#L67-L140)／[.github/copilot-instructions.md#L18-L43](.github/copilot-instructions.md#L18-L43)
- コンパイル後は `npm run watch` 系（`watch:esbuild`/`watch:tsc-*` など）と `start-watch-tasks`（`watch:tsc-extension`、`watch:tsc-extension-web`、`watch:tsc-simulation-workbench`、`watch:esbuild`）を常時動かした状態で変更を確認する必要があります。[package.json#L4970-L5050](package.json#L4970-L5050)

**テスト種別の詳細**
- Unit tests は `npm run test:unit` で Vitest を使い、`**/*.spec.{ts,tsx}` を Node 環境で走らせる設定です（`globals: true`、`.env` を動的読込）。[chat-lib/vitest.config.ts#L1-L14](chat-lib/vitest.config.ts#L1-L14)／[package.json#L4990-L5015](package.json#L4990-L5015)
- Integration tests は `npm run test:extension`（`vscode-test`）で実際の VS Code を起動して拡張機能をチェックし、`test:sanity` で最小構成の sanity チェックもあります。[package.json#L4994-L5010](package.json#L4994-L5010)
- Prompt/Completions コードは `npm run test:prompt`（Mocha の `src/extension/completions-core/vscode-node/prompt/**/test/**/*`）と `npm run test:completions-core`（`tsx` で `completions-core` のカスタムランナー）で分離実行されます。[package.json#L5016-L5032](package.json#L5016-L5032)
- Simulation tests は `npm run simulate` 系の `node dist/simulationMain.js` で動き、複数回（`BASELINE_RUN_COUNT`=10）実行して `test/simulation/baseline.json` を更新・比較、差分があれば `--ci` で失敗します。CLI は `runInExtensionHost` 経由で実際の拡張ホスト／RPC での実行もサポートし、キャッシュ（ChatML・Completions の SQLite）、`SimulationOptions` による `--external-scenarios`/`--gc`/`--require-cache` などのフラグ、`scorecard`・`baseline` 出力、JSON プリンターを備えています。[test/simulationMain.ts#L1-L260](test/simulationMain.ts#L1-L260)／[test/simulationMain.ts#L320-L620](test/simulationMain.ts#L320-L620)／[test/simulationMain.ts#L520-L780](test/simulationMain.ts#L520-L780)／[test/simulationMain.ts#L800-L978](test/simulationMain.ts#L800-L978)
- Simulation のシナリオは一枚岩の `test/simulationTests.ts` に集められ（codeMapper、e2e、inline、intent、prompts、simulation/... などの `.stest` ファイルを import）、テスト実行器はローカル vs 拡張ホストに分割＆ `TaskRunner` で並列化し、`executeTestOnce` で `SimulationTestRuntime`、`TestSnapshots`、`FetchRequestCollector`、状態記録（アウトカム・キャッシュ・JSON）を行います。[test/simulationTests.ts#L1-L40](test/simulationTests.ts#L1-L40)／[test/testExecutor.ts#L81-L170](test/testExecutor.ts#L81-L170)／[test/testExecutor.ts#L240-L420](test/testExecutor.ts#L240-L420)
- シミュレーションだけでなく各種スクリプト全体に Python パッケージ（setuptools、pyright、pylint、ipykernel、numpy、pandas、ruff、tiktoken、rich）を `test/requirements.txt` で列挙しており、ノートブックや ML 評価系のコード実行に備えています。[test/requirements.txt#L1-L9](test/requirements.txt#L1-L9)

**次に試すべきこと（案）**
1. `npm run watch`（`watch:esbuild`/`watch:tsc-*` が同時に走る `npm run watch` を含む）を起動してコンパイル状態を監視しつつ、変更のビルド警告が出ていないことを確認してください。[package.json#L4989-L5000](package.json#L4989-L5000)
2. 目的に応じて `npm run test:unit` → `npm run test:extension` → `npm run simulate-require-cache` → `npm run simulate`（必要なら `npm run simulate-update-baseline`）の順でテストをピンポイントに実行し、`test/simulation/cache` や `baseline.json` を活用して再現性とパフォーマンスを担保してください。[package.json#L4999-L5037](package.json#L4999-L5037)

**テスト全体像**
- パッケージスクリプトに Unit/Vitest、拡張ホスト統合 (`vscode-test`)、Mocha のプロンプト系、completions-core 専用ランナー、シミュレーション系 (`node dist/simulationMain.js` 派生) がまとまっています。[package.json#L4985-L5035](package.json#L4985-L5035)
- 開発中は `npm run watch` で `watch:esbuild` と複数の `watch:tsc-*` を並列実行して型・ビルドエラーを常時確認する前提です。[package.json#L4985-L5004](package.json#L4985-L5004)

**Unit/Vitest**
- Vitest 設定は Node 環境＋globals、有効な `MODE` ごとに `.env` を読込み、対象は `**/*.spec.ts(x)`、ビルド生成物や node_modules は除外です。[chat-lib/vitest.config.ts#L1-L18](chat-lib/vitest.config.ts#L1-L18)
- 実行は `npm run test:unit`（`vitest --run --pool=forks`）、ベンチは `npm run bench` です。[package.json#L4994-L5004](package.json#L4994-L5004)

**拡張機能統合テスト**
- `npm run test:extension` が `vscode-test` を用いて VS Code を起動し、`test:sanity` は軽量サニティ版です。[package.json#L4994-L5004](package.json#L4994-L5004)
- web/extension 両方を型チェックする `typecheck` や watch 系と組み合わせて使う想定です。[package.json#L4985-L4996](package.json#L4985-L4996)

**プロンプト・Completions Core**
- プロンプト系は Mocha で `src/extension/completions-core/vscode-node/prompt/**/test/**/*.test.{ts,tsx}` を走らせる `npm run test:prompt`。[package.json#L5006-L5035](package.json#L5006-L5035)
- Completions-core 専用は `npm run test:completions-core`（`tsx` ランナー）。[package.json#L5006-L5035](package.json#L5006-L5035)

**シミュレーションテスト（`.stest` ベース）**
- エントリ `test/simulationMain.ts` は dotenv を読み込み、CLI 引数を `SimulationOptions` で解釈し、ヘルプ/モデル列挙/スイート列挙/テスト実行を切り替えます。`--ci`/`--require-cache`/`--gc`/`--external-scenarios` などのフラグをサポート。[test/simulationMain.ts#L1-L180](test/simulationMain.ts#L1-L180)・[test/simulationMain.ts#L401-L540](test/simulationMain.ts#L401-L540)
- `runInExtensionHost()` で拡張ホスト側に RPC 接続し、外部から `runTest` を呼び出すパスを持ちます（`SimpleRPC`、`VSCODE_SIMULATION_CONTROL_PORT` 経由）。[test/simulationMain.ts#L96-L200](test/simulationMain.ts#L96-L200)
- `prepareTestEnvironment()` でキャッシュ・出力ディレクトリ・baseline 取り扱い・構成ファイル読込を行い、ChatML/Completions SQLite キャッシュやリソースキャッシュを有効化します（`CacheMode` 切替可）。[test/simulationMain.ts#L140-L330](test/simulationMain.ts#L140-L330)・[test/simulationMain.ts#L540-L690](test/simulationMain.ts#L540-L690)
- 実行は `executeTests()` を呼び出し、完了後にスコアテーブル CSV、JSON レポート、baseline 比較を生成し、`--ci` 時は baseline 乖離で失敗させます。[test/simulationMain.ts#L200-L360](test/simulationMain.ts#L200-L360)・[test/simulationMain.ts#L690-L960](test/simulationMain.ts#L690-L960)
- シナリオ発見は `SimulationTestsRegistry` 経由。外部シナリオ指定時は `discoverTests`（inline/panel 選択）、NES 系は `discoverNesTests`/`discoverCoffeTests`。未指定なら全 stest を import した `test/simulationTests.ts` のスイートを走査します。[test/simulationMain.ts#L404-L520](test/simulationMain.ts#L404-L520)・[test/simulationTests.ts#L1-L80](test/simulationTests.ts#L1-L80)
- `executeTests()` は extHost 実行が必要なシナリオとローカル実行をグルーピングし、`TaskRunner` で並列スケジューリング。各テストは `executeTestNTimes()` で `nRuns` 回実行し、スコア・API 使用量・キャッシュヒットを集計、baseline 比較と CLI 出力を行います。[test/testExecutor.ts#L1-L230](test/testExecutor.ts#L1-L230)
- スコアはシナリオ単位で pass=1/explicitScore を合算し平均化、言語別・モデル別に集計。パラレル実行時は `TaskRunner` がワーカー数を管理します。[test/testExecutor.ts#L120-L230](test/testExecutor.ts#L120-L230)

**シナリオ資産**
- `test/simulationTests.ts` が `e2e/`, `inline/`, `intent/`, `prompts/`, `simulation/` 以下の `.stest` をすべて import してレジストリに登録します。inline やツール、メタプロンプト、notebook、slash-doc など多系統を網羅。[test/simulationTests.ts#L1-L80](test/simulationTests.ts#L1-L80)

**Python/周辺ツール**
- ノートブックや評価系は `test/requirements.txt` に setuptools/pyright/pylint/ipykernel/numpy/pandas/ruff/tiktoken/rich を列挙し、Python 3.10–3.12 対応でセットアップします。[test/requirements.txt#L1-L9](test/requirements.txt#L1-L9)

**実行手順の目安**
- 開発時: `npm run watch` で型・ビルド監視 → `npm run test:unit` で高速チェック → 必要に応じて `npm run test:extension`（統合）、`npm run test:prompt`/`test:completions-core`（プロンプト系）、`npm run simulate` または `simulate-require-cache`（シミュレーション、baseline 検証は `simulate-ci`/`simulate-update-baseline`）。[package.json#L4985-L5035](package.json#L4985-L5035)