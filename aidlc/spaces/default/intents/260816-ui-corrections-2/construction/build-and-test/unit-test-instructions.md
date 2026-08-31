# ユニットテスト手順

## 対象と戦略

上流の `code-generation-plan.md` と `code-summary.md` を根拠に、最小戦略（要件ごとに少なくとも1件、主要コンポーネントの正常系）で既存 Vitest suite を実行する。テストは `tests/src/domain`、`tests/src/ui`、`tests/src/app` にあり、外部状態を共有しない fixture/stub を用いる。

| 要件 | 主な検証範囲 |
| --- | --- |
| FR-1 | 日本語初期値、日英切替、未訳時の日本語フォールバック、メニュー・デッキ・対戦・ダイアログ・カード表示 |
| FR-2 | `cost:asc` の初期化・リセット・再入場、ロケール名比較と card ID 副キー |
| FR-3 | lane/base の data 属性、owner accessible name、色・outline・コントラスト |
| FR-4 | hover/focus/touch の排他、閉鎖条件、popover 位置、既存操作の維持 |
| FR-5 | 5×3 共鳴 table、欠損値の `0`、View 更新時の再描画 |
| FR-6 | 水共鳴候補、click/keyboard payload、成功・失敗・取消時の状態と status |

## 実行方法

全体実行:

```bash
npm test -- --run
```

対象を絞る場合:

```bash
npm test -- --run src/ui/menuScreen.test.tsx src/ui/deckBuildingScreen.test.tsx src/ui/battleScreen.test.tsx
npm test -- --run src/domain/cardSearch.test.ts src/domain/battleProjection.test.ts src/domain/battleResonance.test.ts
```

各テストは実行順に依存させず、表示用ロケールと `PublicBattleView` をテストごとに生成する。UI 文言ではなく、規則の card ID/effect ID/`BattleValidationIssue.code` に対する表示境界も確認する。

## 期待値と制約

最小戦略のため新規カバレッジ率の数値ゲートは定義しない。代わりに FR-1〜FR-6 の受入条件を直接検証する。全 suite は成功済み（33 files / 296 tests）。カバレッジ計測、実ブラウザ、画面読上げソフトでの手動確認は今回の実行範囲外であり、リリース前の追加確認事項である。
