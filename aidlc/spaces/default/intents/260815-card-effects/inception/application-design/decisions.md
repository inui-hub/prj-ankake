# Architecture Decisions

## ADR-001 — Domain-resident declarative effect resolver

**Context:** Card-specific effects are currently unresolved in the battle domain.

**Decision:** Add a typed effect catalog and resolver inside `packages/domain`.

**Consequences:** Atomic rules and testability are preserved; the initial type model is a substantial change.

**Alternatives Considered:** UI-side dispatch duplicates game rules; an external service breaks local atomic resolution.

## ADR-002 — Derived modifiers instead of base-value mutation

**Context:** Continuous, temporary and invalidated effects must compose safely.

**Decision:** Preserve base values and derive effective values from ordered modifiers.

**Consequences:** Expiry and invalidation are reliable; projections must use effective values.

## Resolution Contracts

- `EffectSelection` is a discriminated union for creature, base, lane, cell, graveyard-card and no-target selections; the resolver revalidates each selection.
- `EffectResolution` is a discriminated union of `resolved`, `fizzled`, and `rejected`, with typed reason, source, targets, state and ordered events.
- `PendingTrigger` records source instance, effect ID, trigger type and monotonic sequence. The queue drains in creation order after the initiating resolution; destroyed sources retain their queued trigger snapshot.
- The catalog coverage validator requires one explicit entry per all 62 cards/tokens, including a `none` definition for documented no-effect cards.
- Random effects use the existing deterministic RNG state; each draw records its state transition and event payload for replayable tests.

## Ordering and Catalog Rules

- Trigger identity is `(sourceInstanceId, effectId, triggerEventId, sequence)`; ties are broken by the monotonic sequence assigned by the initiating command. A trigger created while draining is appended after the current trigger, and invalidated sources retain only their already-captured trigger payload.
- Resolution boundaries are one `submitCommand` transaction: validate command, apply primary operations in card-text order, enqueue triggers, then drain to quiescence before projection.
- Catalog entries use canonical card ID, card version, exact effect text, ordered effect IDs and a `none` marker. Import validation rejects placeholder IDs/text and verifies all 62 documented IDs exactly once.
- Random candidate sets are sorted by stable instance ID before sampling. The updated RNG state is returned in `EffectResolution` and committed with the event, then all sampled targets are revalidated immediately before their operation.

## Schemas

`BattleEvent` has `{ id, commandId, sequence, kind, source?, effectId?, targets, data }`; documented trigger types map only to registry-declared handlers. A per-command visited `(eventId,effectId,source)` set prevents duplicate reentrancy and draining terminates when the queue is empty.

`CardEffectCatalogEntry` has `{ cardId, version, effectText, effects: EffectDefinition[] | "none" }`. `docs/project_ankake_all_cards_v1_1.md` is imported into an exact 62-ID manifest; placeholder text is rejected and documented no-effect cards use `"none"`.

`RngState` is owned by `BattleState`. Each random operation emits `rng.advanced` with pre-state digest, sorted candidate IDs, draw index, chosen ID, and post-state digest; multi-draw effects repeat in card-text order.

## Canonical Manifest and Resolution Mapping

`card-effect-manifest.ts` exports a `Readonly<Record<CardId, CardEffectCatalogEntry>>` containing exactly `AK-001` through `AK-060`, `AK-T-001`, and `AK-T-002`. Each entry carries the exact card-text digest from the authoritative docs, version, and either ordered `EffectDefinition[]` or `"none"`. Build validation fails on a missing ID, unknown ID, duplicate ID, placeholder text, or mismatched effect-text digest.

`GameEngine.submitCommand` returns `CommandResult = { accepted: true, resolution: EffectResolution } | { accepted: false, rejection: RejectReason, state }`. A primary operation failure records `{ operationIndex, operation, reason }` in `EffectResolution`; card-text processing stops only where the definition says it stops, otherwise later operations run against the latest state. The projection maps `rejected` to an error affordance, `fizzled` to an explanation, and `resolved` to event-driven UI updates; CPU consumes the same `PublicEffectChoice` candidate set.

## Existing-Type Alignment (Authoritative)

The single manifest owner is `catalog/effects.ts`; `card-effect-manifest.ts` is not created. Existing `BattleEvent`, `BattleCommandResult`, and `BattleRngState` remain the public domain types. The new effect types adapt into those types rather than replace them: each effect event uses existing event fields plus typed `data.effectId`, `data.targets`, and `data.resolution`. `BattleCommandResult` maps `rejected` to its existing rejection path and `resolved`/`fizzled` to its success path with effect event data.

`PendingTrigger.sequence` is the existing engine event sequence; ties break by `sourceInstanceId`, then `effectId`. Only a resolved `BattleEvent` with a registry-declared trigger type creates a trigger. `BattleRngState` is committed only with a successful resolved/fizzled command transaction; rejected commands retain the original RNG state. Event data records pre/post RNG state values rather than introducing a separate digest type.

## Final Integration Decisions

1. Extend `BattleEvent.data` to a discriminated `BattleEventData` union with primitive-compatible variants plus `{ kind: "effect"; effectId; targetIds; resolution }`; existing events retain their current variant.
2. Add `effectsByCardId` to `StaticCatalogSnapshot`; snapshot construction validates the 62-entry manifest and runtime lookup reads only this snapshot.
3. Extend `BattleCommandResult` with `effect: { status: "resolved" | "fizzled"; completedOperationCount; failedOperation? }`; command rejection remains its existing error branch.
4. Registry definitions declare `triggers: TriggerSpec[]`; an event snapshots trigger source and definition immediately after its primary operation, then enqueues that snapshot. Destroyed sources therefore resolve their already-created trigger correctly.
5. Rename design references to `BattleRngState`. `submitCommand` stages RNG changes locally and commits them only with accepted results; rejected commands return the original state, while fizzles commit only draws already performed by their documented effect.

`TriggerSpec` is `{ on: BattleEventKind; when?: PredicateId; effectId: EffectId; target: "source" | "event-target" | "controller"; oncePer?: "turn" | "event" }`. After each primary operation, the engine constructs an existing `BattleEvent`, filters catalog `TriggerSpec` values by `on` and `when`, snapshots source/target/controller IDs, and enqueues in event sequence order. `BattleRngState` is cloned before resolution; its clone replaces state only when the command returns the existing success `BattleCommandResult`, including a documented fizzle; rejected results retain the input state unchanged.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T06:00:21Z
**Iteration:** 4

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | components.md / component-methods.md:5-19 | `EffectSelection` の variant 名はありますが、各 ID の値域・複数対象の選択数／順序・対象制約、`GameEngine.submitCommand` に渡す command DTO と `LegalTargets` の UI/CPU 投影形がありません。FR-003/FR-006 の入力から実行結果までを実装者が確定できません。 | 全 selection variant、command/result DTO、LegalTargets の具体型と、対象数不足・一部不正・重複の判定を契約化する。 |
| 2 | Major | component-dependency.md / component-methods.md / decisions.md:25,31 | `PendingTrigger` と sequence の方針はありますが、board entry・summon・destruction・movement 等のどのドメインイベントが何を enqueue するか、同時イベントの順序、drain 中の無効化判定が定義されていません。`drain` の停止条件だけでは決定的な誘発順を実装できません。 | trigger 構造、イベント→enqueue 規則、同時処理の tie-break、再入・無効化・quiescence の状態遷移を表で固定する。 |
| 3 | Major | decisions.md:26,33 / requirements.md: FR-001 | 「62-ID manifest を import する」とありますが、成果物に authoritative な ID 一覧または生成元・生成規約がありません。本文は 60 normal + 2 token とする一方、既存アーキテクチャとの差分や no-effect の正規化も成果物から検証できず、catalog 完全性検査を実装できません。 | canonical 一覧（または再現可能な仕様抽出規約）を記録し、欠落・余分・重複・本文／effect identity 不一致の失敗条件を定義する。 |
| 4 | Major | component-methods.md:17 | `EffectResolution` は `resolved`/`fizzled`/`rejected` の3分岐ですが、本文は ordered operations 中の failed operation と partial effects を許容しています。partial の状態差分、失敗理由、消費／非消費、既存 `BattleCommandResult` への変換が型に現れず、実装判断が残ります。 | partial を明示する分岐または構造化 payload、atomic delta、理由、消費規則、既存 command result への変換を定義する。 |
| 5 | Major | component-methods.md:19 / decisions.md:34 | deterministic RNG の名称と event payload 項目はありますが、`RngState` の型・初期化・`BattleState` への commit 境界、複数 draw の更新順、digest の算出規約、transaction 失敗時の rollback が未定義です。replay と immutable submit の実装契約が不足しています。 | RNG 型／所有境界、draw ごとの遷移、digest／event schema、commit・rollback 規則を具体化する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor-required-sections.ts` | PASS (components 3 H2, component-methods 3 H2, services 2 H2, component-dependency 2 H2, decisions 6 H2) | Required document shape is present; this does not validate architectural contracts. |
| `aidlc-sensor-upstream-coverage.ts` | PASS (`requirements` referenced; 0 unreferenced) | Upstream references are present according to the sensor; this does not establish the missing canonical-ID, trigger, partial-resolution, or RNG contracts. |

### Summary

センサーは通過しますが、型・トリガー順序・62枚の検証入力・partial 結果・RNG commit 境界の5件の Major が残っています。現状のままでは、開発者が `GameEngine.submitCommand` から全効果を決定的に実装する際に設計者へ確認が必要なため、承認可能な Application Design ではありません。
