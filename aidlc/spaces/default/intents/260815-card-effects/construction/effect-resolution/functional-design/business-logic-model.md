# Business Logic Model — effect-resolution

## Context

この単位は [unit-of-work](../../../inception/units-generation/unit-of-work.md) と [unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md) の解決器を実現する。[requirements](../../../inception/requirements-analysis/requirements.md) の FR-002〜FR-005、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力契約とする。

## Resolution Workflow

1. 検証済み catalog から source の ordered effect definitions を得る。
2. command acceptance 時の選択を resolution 直前に再検証する。
3. effect の操作をカード本文順に適用する。各操作前に対象集合を安定 ID 順で検査する。
4. 失敗操作は operation index、理由、消費規則を記録する。本文に停止条件がなければ最新 state に対して後続操作を続ける。
5. 操作が生成した event から registry 対応の trigger snapshot を作り、event sequence、source instance ID、effect ID で順序付ける。
6. キューを空になるまで drain し、既に snapshot 済みの destroyed source は snapshot payload で処理する。visited key と depth 上限で再入を止める。
7. modifier の有効値を導出し、期限切れ・無効化を反映する。乱数候補は安定 ID 順にして局所 RNG を進める。
8. resolved/fizzled のみ staged state・events・RNG を返し、rejected は入力 state と RNG を返す。

## Decision Tree

- command または selection が不正: rejected、state 未変更。
- effect 全体が有効対象を持たない: documented consumed 規則に従う fizzled。
- 一部の操作が失敗: failed operation を記録し、停止規則がなければ後続操作を実行。
- trigger depth/visited 制限超過: typed trigger-loop rejection、部分 state は command transaction の既存失敗規則に従う。

## Determinism

event sequence は command 内で単調増加し、同順イベントの tie-break は source instance ID と effect ID である。RNG は clone を使い、乱数 draw の前後値と候補・選択を event data に残す。

## Concrete Result and Trigger Contract

resolver result は既存 `BattleCommandResult` に写像する。rejected は `{ accepted: false, rejection, state: inputState }` とし RNG/event を変更しない。accepted は `{ accepted: true, state, events, rng, effect: { status: "resolved" | "fizzled", completedOperationCount, failedOperation?: { operationIndex, reason }, consumed } }` とする。`EffectDefinition` は各 operation に `stopOnFailure` と target cardinality を持つ。`TriggerSpec.on` は実在の `BattleEventType`、`when` は registry predicate、`target` は source/event-target/controller である。event type ごとの registry が snapshot を enqueue し、depth 64 または visited 重複は typed rejection とする。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T07:00:17Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | business-logic-model.md: Concrete Result and Trigger Contract; inception/application-design/component-methods.md:23-24; packages/domain/src/battle/types.ts:362-374 | 改訂契約は `accepted/rejected`、`effect`、`rng`、`failedOperation` を要求するが、上流の公開 `EffectResolution` は resolved/fizzled の2 variant のままで、実コードの `BattleCommandResult` は `ok/state/events` または `ok/state/issues` の形で `effect`/`rng` を持たない。さらに現行 `GameEngine` は `resolveEffect` command を受け付けず、`effects.ts` は state/events だけを返す。resolver と integration の戻り値・commit 境界をこの成果物だけから実装できない。 | 上流型と実装境界を同じ canonical 型定義へ更新し、`ok` と `accepted` の写像、rejected/partial/trigger-loop 各 payload、BattleState の RNG commit/rollback、`resolveEffect` command の導入箇所を明記する。 |
| 2 | Major | business-logic-model.md: Concrete Result and Trigger Contract; services.md: DTO and Queue Schema; packages/domain/src/battle/types.ts:232-258 | `TriggerSpec.when` を「registry predicate」、event type ごとの registry とだけ記載しており、実在する `BattleEventType` のどれが誘発可能か、`PredicateId` の型・定義、handler、snapshot の必須フィールドがない。`BattleEvent.data` は string/number/boolean の map だが、契約は source/target/controller の snapshot を要求するため、イベントから PendingTrigger を生成する具体的な payload 形を決められない。 | `BattleEventType`→許可 predicate/handler→snapshot schema→生成される effect の完全な表を catalog/contract に追加し、未知 event/predicate の build-time failure と drain 中の enqueue 規則を型で固定する。 |
| 3 | Major | business-logic-model.md: Resolution Workflow 3-7 and Concrete Result; effect-contract-catalog/functional-design/domain-entities.md: EffectDefinition | `stopOnFailure` と target cardinality の存在は宣言されたが、operation の discriminated schema、対象消滅時の各 operation の failure/fizzle/consume policy、modifier 演算、カード別 trigger の定義は依然としてない。`documented`／`registry 対応`という参照だけでは、62枚の definition から state/event/RNG を決定的に実装できない。 | EffectDefinition の全 operation kind と必須属性、card/effect ID ごとの operation/target/stop/consume/trigger 表、各 failure reason と生成 event を catalog の canonical contract に追加する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor-required-sections.ts` | PASS: 6 H2 headings, 0 findings | Required document shape is present; it does not validate semantic or code-type compatibility. |
| `aidlc-sensor-upstream-coverage.ts` | PASS: all 6 consumes referenced, 0 unreferenced | References exist; it does not detect that the referenced upstream result type and repository code disagree with this contract. |
| `aidlc-sensor-linter.ts` | `eslint-unavailable` | No lint executable was available; no code snippets were present to lint. |
| `aidlc-sensor-type-check.ts` | `tsc-unavailable` | No TypeScript compiler was available; the concrete type mismatch was verified by source inspection instead. |

### Summary

Concrete Result and Trigger Contract は前回の戻り値の曖昧さを一部整理したが、上流公開型と実コードの `BattleCommandResult`／engine command path に反映されていない。trigger registry と operation/card 定義も実装に必要な粒度へ達していないため、設計者への確認なしに実装できず NOT-READY とする。
