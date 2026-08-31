## 品質評価

domain/app/ui/cpu/persistence のテストが分離され、共鳴、盤面、投影、検索、UI 画面のテストが確認できる。root に `typecheck` と `test` がある。

### 主なリスク

- `runStartup` が日本語表示文言を注入し、`effectPrograms` が `effectText` を照合するため、翻訳が規則実行を壊しうる。
- UI 文言が各コンポーネントに散在しており、全画面切替の網羅性を検証しにくい。
- `BattleBoard` はマスを button として実装する。カード詳細の実装でネストした操作要素を作るとアクセシビリティを損なう。
- coverage threshold、ESLint/Prettier/Biome 設定、CI workflow は今回の部分スキャンでは検出されなかった。

### 推奨する回帰境界

ロケールごとの表示と規則同一性、初期ソート、公開対戦投影、hover/focus のカード詳細、盤面からの水共鳴命令をそれぞれテストする。

### ソース証跡

`tests/src/`, `tests/vitest.config.ts`, `apps/web/src/startup/startupOrchestrator.ts`, `packages/domain/src/battle/effectPrograms.ts`, `packages/ui/src/components/battle/BattleBoard.tsx`。
