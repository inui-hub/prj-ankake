# Code Summary — effect-resolution

## 変更内容

- `packages/domain/src/battle/effectTypes.ts` を追加し、効果選択、operation、解決結果、modifier、trigger の型契約を定義した。
- `packages/domain/src/battle/effectResolver.ts` を追加し、対象を解決直前に再検証して stable ID 順で処理する純粋な解決器を実装した。damage、heal、event 発行を操作として扱い、部分解決と不発をイベント・結果へ明示する。
- `packages/domain/src/battle/effectSupport.ts` を追加し、期限/無効化を除外した modifier 値の導出と、イベント順・source ID・effect ID で決定的に drain する trigger queue を実装した。visited key と depth 制限超過は `trigger-loop` として返す。
- `packages/domain/src/battle/index.ts` を更新して新 API を公開し、既存の単純 spell helper の結果型を `SimpleEffectResolution` へ改名して型名衝突を避けた。
- `tests/src/domain/effectResolution.test.ts` を追加し、成功、不発、決定的順序、loop 検出、modifier の期限を検証した。
- 先行 catalog unit のテストが TypeScript の union narrowing に依存していたため、`tests/src/domain/staticCatalogValidation.test.ts` を安全な分岐形式へ補正した。動作要件は変更していない。

## 実装判断

解決器は engine に state を commit せず、成功時だけ staged state/events/RNG を返す。拒否は入力 state/RNG の同一参照を返す。現状の catalog は文書化された effect operation だけを持つため、各カードを executable operation へ変換して engine command と結合する処理は `battle-effect-integration` と catalog の後続作業に残す。

## 検証

- `npm run typecheck --workspace=@ankake/domain` — 成功
- `npm run typecheck -w @ankake/tests` — 成功
- `npm run test -w @ankake/tests -- --run src/domain/effectResolution.test.ts` — 4 tests 成功
- `npm run test -w @ankake/tests` — 31 files / 197 tests 成功

## Deviations

設計成果物が `BattleCommandResult` の統合契約を確定していないため、既存の `GameEngine` と UI/CPU の command path は変更していない。これにより既存公開 API の互換性を維持し、統合 unit が transaction 境界を一意に所有できる。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T08:12:16Z
**Iteration:** 4

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `packages/domain/src/battle/engine.ts:106-118,149-180` | `getExecutablePlayEffects` は全 `effectIds` を返すようになったが、summon/cast の engine は依然 `...[0]` のみを `resolveEffect` へ渡す。したがって複数 effect ID の ordered execution は lifecycle 側にしかなく、play effect の後続 ID は無視される。追加テストも `getExecutablePlayEffects` の配列を確認するだけで、command 経路で全 ID が実行されることを確認していない。 | effect ID ごとの definition を順序どおり command transaction 内で全て解決し、各 ID の state/RNG/events を次へ渡す。複数 ID の統合テストで全 effect event と state delta を検証する。 |
| 2 | Major | `packages/domain/src/battle/effectResolver.ts:15-38`, `packages/domain/src/battle/cardEffectRuntime.ts:107-120` | resolver の `EffectContext.rng` は rejected 時に返す値としてしか使われず、script は `state.metadata.rng` を直接読んで更新する。context の RNG と state metadata が異なる呼び出しでは returned `rng` が context と一致せず、同一 resolver API 内に二つの source of truth が残る。複数 draw の前後値を検証するテストもない。 | resolver 開始時に staged state metadata を context.rng へ統一し、script は明示的な staged RNG を受け渡す。accepted/rejected、複数 draw、lifecycle draw で `state.metadata.rng === result.rng` と rollback を検証する。 |
| 3 | Major | `packages/domain/src/battle/effectResolver.ts:65-69`, `packages/domain/src/battle/effectTypes.ts:16-18` | structured selection のうち `lane`/`coordinates`/`graveyardCardIds` は `EffectTarget` に正規化されず、通常の `damage`/`heal`/`emit` operation では `selectionTargets` が空集合になる。一方 card-script だけが selection の内部値を個別解釈するため、同じ command selection の意味が operation kind ごとに分裂し、generic operation の組み合わせは実装不能または黙って fizzled になる。 | lane/cell/graveyard を含む selection の discriminated target schema、許可 operation、cardinality、再検証を一元化し、generic operation と script の組み合わせを integration test で固定する。 |
| 4 | Major | `packages/domain/src/battle/lifecycleEffects.ts:20-51`, `packages/domain/src/battle/effectTypes.ts:46-53` | `PendingTrigger.depth` は型に存在するが lifecycle drain が生成・更新・検査していない。実装は全 trigger の visited 件数を 64 で制限するだけで、契約の depth 上限と trigger snapshot の chain depth を実現していない。異なる sequence の再入は同一 chain でも別 key として進み、depth policy を変更できない。 | enqueue 時に親 depth+1 を保持し、depth 上限超過を `trigger-loop` として typed rejection にする。depth 境界と sibling trigger の判定をテストする。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm run typecheck --workspace=@ankake/domain` | PASS | 型整合性は確認できるが、`...[0]` による effect 欠落、RNG source 分裂、未使用 depth は検出されない。 |
| `npm run test -w @ankake/tests -- --run src/domain/effectResolution.test.ts src/domain/battleEffectIntegration.test.ts src/domain/cardEffectCoverage.test.ts` | PASS: 3 files / 73 tests | typed lifecycle rollback、structured creature/base、単一 effect の coverage は通過するが、play の複数 ID、context/state RNG 不一致、lane/cell/graveyard の generic operation、depth chain は未検証。 |

### Summary

trigger-loop の typed rejection と command rollback は前回より改善され、基本テストも通過した。しかし play 経路の複数 effect 欠落、RNG source の二重化、structured selection の operation 間不整合、未実装の depth policy が残るため、全体を開発者が追加の設計判断なしに安全に実装できる状態ではなく NOT-READY とする。
