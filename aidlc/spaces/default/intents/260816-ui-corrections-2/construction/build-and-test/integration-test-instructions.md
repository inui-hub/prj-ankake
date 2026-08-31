# 結合テスト手順

## 対象範囲

最小テスト戦略では結合テストは必須ゲートではない。ただし `code-generation-plan.md` と `code-summary.md` にある cross-layer 経路は、既存 Vitest の UI/app テストで回帰確認する。

- `AppShell` の locale state から web 表示変換、UI コンポーネント、fatal/loading dialog への伝播（FR-1）。
- deck workflow から domain 検索条件、ローカライズ名比較、デッキ画面のリセットまで（FR-2）。
- domain の `PublicBattleView` / `BattleValidationIssue.code` から controller、盤面の `role="status"` まで（FR-3、FR-5、FR-6）。
- 既存 square button の roving focus・command と、非操作的カード詳細の共存（FR-4）。

## 実行方法

```bash
npm test -- --run src/ui/deckBuildingScreen.test.tsx src/ui/battleScreen.test.tsx src/app/battleRuntimeService.test.ts src/app/battleInteraction.test.ts
```

テストデータは公開 ViewModel と command 結果をテスト内で生成し、network、DB、外部 API を使わない。成功では command payload と UI 更新、失敗では session state 不変・code によるローカライズ status・強調解除を確認する。

## 判定と既知制約

上記の既存結合相当テストは全 suite 成功に含まれる。別プロセスの実 web server、実ブラウザ、外部サービスを起動する E2E/契約テストは、この bugfix の最小戦略および対象システム境界に含めない。実装後に API や外部境界は追加されていない。
