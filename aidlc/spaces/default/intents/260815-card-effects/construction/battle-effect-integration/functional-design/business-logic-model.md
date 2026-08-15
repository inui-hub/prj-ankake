# Business Logic Model — battle-effect-integration

## Context

この単位は [unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md) の FR-002、FR-004、FR-006 を接続する。[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) の public boundary を実装対象とする。

## Command Workflow

1. UI/CPU は `LegalTargetService` の `PublicEffectChoice` を取得する。
2. command は source instance、effect ID、selection を含んで `GameEngine.submitCommand` に渡す。
3. engine は source、effect ID、selection を再検証し、`EffectContext` を構築する。
4. resolver の rejected は既存 rejection path へ、resolved/fizzled は success path の effect status と ordered events へ写像する。
5. accepted result だけが state、RNG、event log、public projection を一つの immutable transaction として更新する。

## Projection Flow

projection は engine が使った同じ legal-target result から候補を作る。UI は候補を表示するだけで任意 target を生成しない。CPU は同じ候補集合から選択するため、UI/CPU の選択可能性と engine の拒否規則は一致する。

## Concrete Conversion and Error Contract

`PublicEffectChoice` は `{ effectId, sourceInstanceId, selectionKinds, candidates }`、candidate は `{ kind, id, label }` とする。選択変換は candidate の kind ごとに一意な `EffectSelection` variant を作り、unknown ID、重複、cardinality 違反、stale candidate は engine の revalidation で rejection とする。UI は rejection code を説明表示し、CPU は同じ code を不正行動の評価として受け取る。trigger-loop または partial operation の accepted/rejected 境界は resolver の `BattleCommandResult` 契約をそのまま使用し、統合層は rollback を独自に行わない。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T06:55:57Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | business-logic-model.md: Command Workflow 4-5; upstream `application-design/component-methods.md` の `EffectResolution` 型 | 本文は resolver の `rejected` 分岐と `BattleRngState` を前提にするが、渡された上流の公開型は `resolved`/`fizzled` しか定義せず、`rng` も `RngState` と `BattleRngState` で不一致である。さらに `BattleCommandResult` への rejected/partial failure の写像が存在しないため、`submitCommand` の戻り値と commit 可否を実装者が一意に決められない。 | `EffectResolution` の全 variant/payload、`BattleCommandResult` の各分岐、partial failure の state/event/RNG 消費規則を上流契約と同じ型定義に統合し、この単位の workflow を更新する。 |
| 2 | Major | business-logic-model.md: Command Workflow 4-5; upstream `application-design/services.md` の Lifecycle/`trigger-loop` | accepted result の「一つの immutable transaction」は宣言だけで、trigger drain 中の `trigger-loop` rejection、部分解決、既実行 RNG draw の扱いが未定義である。resolver が ordered events/state を返した後に queue drain が失敗した場合に全 rollback するのか、fizzle として commit するのか、event log を残すのかを追跡できず、二重適用・状態とイベントの不整合を防げない。 | catalog lookup から queue drain、projection までの staged state/event/RNG と commit/abort の境界を分岐表で定義し、trigger-loop と failed operation を含む結果を明示する。 |
| 3 | Major | business-logic-model.md: Projection Flow; upstream `application-design/services.md` の `PublicEffectChoice`/`EffectCommand` と `component-methods.md` の `EffectSelection` | 共通候補を使う方針はあるが、`candidates: {kind,id,label}[]` から discriminated `EffectSelection`（creatures の複数 ID、base/lane/cell/graveyard-card/none）への変換、source instance の検証、候補が stale になったときの UI/CPU の再取得・エラー契約がない。UI/CPU が同一候補を表示しても、同じ command shape と拒否結果になることを開発者は導けない。 | selection kind ごとの candidate→command mapping、複数選択・空選択の cardinality、stale candidate の再投影／拒否と CPU retry の観測可能な結果を定義する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor.ts fire required-sections --stage functional-design` | PASS (no error) | 必須構造は満たすが、契約型の整合性は検証しない。 |
| `aidlc-sensor.ts fire upstream-coverage --stage functional-design` | PASS (no error) | requirements と上流成果物への参照は存在するが、参照先の rejected/RNG 型矛盾は検出しない。 |
| `aidlc-sensor.ts fire linter/type-check --stage functional-design` | NOT APPLICABLE (output path is Markdown; filters require `*.ts`/`*.tsx`) | コード型検査はこの成果物には適用されず、上記の設計契約問題を解消しない。 |
| `aidlc-validate.ts outputs construction` | PASS (functional-design outputs: 4, missing: 0) | 成果物の存在のみ確認され、実装可能性や cross-boundary 契約は保証しない。 |

### Summary

成果物は command/projection の意図と参照先を示すが、上流の解決結果型と本文の分岐が矛盾し、transaction failure と selection mapping の境界も未定義である。`GameEngine.submitCommand` を設計者への確認なしに実装できないため NOT-READY とする。
