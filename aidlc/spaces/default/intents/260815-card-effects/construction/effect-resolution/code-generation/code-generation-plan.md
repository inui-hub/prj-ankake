# Code Generation Plan — effect-resolution

## 実装計画

- [x] Step 1: 既存の battle 型、RNG、board/base 操作、および先行 catalog の effect 定義を確認し、FR-002〜FR-005 のうちこの単位の境界を確定する。
- [x] Step 2: `packages/domain/src/battle/effectTypes.ts` に、選択、対象規則、実行可能操作、解決結果、modifier、pending trigger の不変契約を追加する。FR-003 / FR-004 / FR-005。
- [x] Step 3: `packages/domain/src/battle/effectResolver.ts` に、解決時の対象再検証、stable ID による順序化、カード本文順の operation 実行、部分解決・不発と event 発行を実装する。FR-002 / FR-003 / FR-004。
- [x] Step 4: `packages/domain/src/battle/effectSupport.ts` に、modifier の導出・期限除外と、順序保証・visited/depth 制限を備えた trigger queue drain を実装する。FR-003 / FR-005。
- [x] Step 5: `packages/domain/src/battle/index.ts` から基盤 API を公開し、既存の単純 spell 解決型との公開名衝突を解消する。FR-002。
- [x] Step 6: `tests/src/domain/effectResolution.test.ts` に、成功、対象消滅による不発、安定順序、trigger loop、modifier 期限の unit test を追加する。FR-003 / FR-004 / FR-005。
- [x] Step 7: `@ankake/domain` と `@ankake/tests` の typecheck、および対象・全 Vitest suite を実行する。

## 境界

`GameEngine.submitCommand` への接続、カードごとの宣言を実行可能 operation へ変換する catalog 完成、UI/CPU の候補投影、62枚全件の回帰網羅は別 unit の所有範囲である。この単位はそれらが呼び出す純粋で決定的な解決基盤のみを提供する。
