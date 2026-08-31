## API・内部契約

外部の REST、GraphQL、認証 API はない。起動時に `/data/cards.json`、`/data/tokens.json`、`/data/version.json` を取得し、デッキは IndexedDB に保存する。

- `runStartup()` は静的データを検証し `AppEvent` を返す。
- `appStateReducer` / `projectMenuViewModel` は画面遷移状態を管理・投影する。
- `DeckRepository` はデッキ保存境界、`BattleCommand` / `validateBattleCommand` は対戦命令境界である。
- `projectPublicBattleView()` は UI が読む対戦表示境界であり、`BattleCardView` と共鳴情報を返す。

UI 修正では、ロケールを UI/アプリ層から明示的に渡し、カード表示（名称、効果、スタッツ）を locale-aware view model として解決する。`effectText` の文字列照合は実行契約にしてはならない。

### ソース証跡

`apps/web/src/startup/{staticAssetClient,startupOrchestrator}.ts`, `packages/domain/src/{app-state,battle/projection.ts,battle/validation.ts}`。
