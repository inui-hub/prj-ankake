# Components

## Context

This design implements the requirements in [requirements.md](../requirements-analysis/requirements.md) on the existing [battle architecture](../../../codekb/prj-ankake/architecture.md).

## Components

| Component | Responsibility | Public boundary |
| --- | --- | --- |
| EffectCatalog | Maps card/effect IDs to declarative effect definitions. | `getEffectDefinition(effectId)` |
| EffectResolver | Validates targets and atomically resolves effect operations. | `resolveEffect(context, selection)` |
| TriggerQueue | Queues and drains summon, destruction and movement triggers in order. | `enqueue`, `drain` |
| ModifierEngine | Derives effective values from base state, duration and invalidation. | `getEffective*`, `expireModifiers` |
| LegalTargetService | Produces legal targets for UI and CPU from the same domain rules. | `getLegalTargets` |

## Boundaries

All components reside in `packages/domain`; web UI and CPU consume public projections and commands only.

## Concrete Ownership

`catalog/effects.ts` owns the canonical 62-entry manifest and validation. `battle/effectTypes.ts` owns selection, context, resolution, event and queue types. `battle/effects.ts` owns pure operations; `battle/engine.ts` owns command mapping, transaction boundaries and queue draining. `battle/projection.ts` owns `PublicEffectChoice`; CPU consumes it but cannot construct unvalidated selections.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T06:24:25Z
**Iteration:** 9

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | component-methods.md:19 / decisions.md: Resolution Contracts, Final Integration Decisions 3, 5 | 公開型契約が同一文書内で実装不能なほど矛盾している。`EffectResolution` のコード例は `resolved`/`fizzled` のみで `rejected` と `failedOperation` を持たず、`EffectContext.rng` は `RngState` のままだが、決定事項は `BattleRngState` と `BattleCommandResult.effect.failedOperation` を要求している。partial failure、拒否、RNG commit の戻り値を実装者が一意に決められない。 | `EffectResolution` の全 variant と payload を確定し、`EffectResolution`→既存 `BattleCommandResult` の全分岐、partial failure の消費規則、RNG 型・commit 境界を同一の型定義で整合させる。 |
| 2 | Major | decisions.md: Final Integration Decisions 1, 4 / services.md: DTO and Queue Schema | `TriggerSpec.on` は未定義の `BattleEventKind` を参照する（既存コードの型は `BattleEventType`）。さらに registry handler／`PredicateId` の定義、event type ごとの source/target/controller snapshot payload がなく、summon・destruction・movement 等の誘発表を再現できない。これは単なる命名差ではなく、イベントから queue へ変換する契約が欠落している。 | 実在するイベント型名に統一し、`PredicateId`、handler registry、各イベント→TriggerSpec payload の完全な対応表と drain 中の追加・無効化規則を定義する。 |
| 3 | Major | decisions.md: Final Integration Decisions 2 / packages/domain/src/catalog/types.ts, snapshot.ts | `StaticCatalogSnapshot` に `effectsByCardId` を追加すると決めているが、値の型、`StaticCatalogInput` からの構築元、62エントリ検証の失敗結果、既存 snapshot consumers への移行契約がない。既存実装は `cardsById`/`tokensById` のみを構築するため、EffectCatalog がこの snapshot を読む経路を開発者が推測する必要がある。 | `effectsByCardId` の完全な型と構築・検証 API、catalog build failure の型、snapshot versioning と全 consumer 更新を明記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor-required-sections.ts` | PASS (components 5 H2, component-methods 3 H2, component-dependency 2 H2, services 3 H2, decisions 9 H2) | Document shape is present; it does not validate type or integration consistency. |
| `aidlc-sensor-upstream-coverage.ts` | PASS (`requirements` referenced; 0 unreferenced) | Requirements traceability is present; it does not validate the missing runtime contracts above. |

### Summary

センサーは通過するが、公開解決型の矛盾、未定義イベント／trigger registry 契約、catalog snapshot の未定義が残っている。`submitCommand` の効果経路と既存ドメイン型への統合を開発者が一意に実装できないため、承認可能な Application Design ではない。
