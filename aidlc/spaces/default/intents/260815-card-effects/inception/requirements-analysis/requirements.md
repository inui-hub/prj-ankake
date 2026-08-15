# Requirements

## Sources and Traceability

- Intent: [intent statement](../../ideation/intent-capture/intent-statement.md)
- Scope: [scope document](../../ideation/scope-definition/scope-document.md)
- Current-state analysis: [business overview](../../../codekb/prj-ankake/business-overview.md), [architecture](../../../codekb/prj-ankake/architecture.md), and [code structure](../../../codekb/prj-ankake/code-structure.md)
- Authoritative card behaviour: `docs/project_ankake_all_cards_v1_1.md` and `docs/project_ankake_card_detailed_requirements_spec_v1_1.md`

## Intent Analysis

Implement the documented behaviour for all 60 normal cards and 2 token cards in the existing TypeScript battle domain. The current system implements five resonance mechanics but no card-specific effect resolver.

## Functional Requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-001 | The static catalog shall represent the 62 documented cards/tokens with authoritative effect identity and text. | Validation identifies every documented card; cards specified without an effect have no executable placeholder effect. |
| FR-002 | The battle domain shall resolve each documented card effect when its documented trigger occurs. | An automated test exercises each effect's trigger, target and result. |
| FR-003 | The resolver shall support spell, summon, destruction, movement, continuous and duration-bound effects needed by the specifications. | Each documented timing resolves in card-text order and produces deterministic state/events. |
| FR-004 | The resolver shall validate and revalidate effect targets at resolution time. | Invalid targets are rejected or fizzle according to the applicable rule without corrupting state. |
| FR-005 | The domain shall model modifiers, duration, effect invalidation, generated tokens and pending triggers where required. | Tests prove expiry, invalidation and trigger ordering for each affected card. |
| FR-006 | UI projection and CPU use the same legal-action and target-validation rules as the battle engine. | No card effect can be selected or executed through UI/CPU when engine validation rejects it. |

## Non-Functional Requirements

- The existing TypeScript workspace architecture remains a modular monolith; no external service is introduced.
- Effect resolution remains deterministic and immutable within `GameEngine.submitCommand`.
- All existing tests and new effect tests must pass.
- Ambiguities in the specifications are resolved from existing rules and analogous specifications, with the applied interpretation captured in tests.

## Constraints

- `docs` detailed card specifications are authoritative over current implementation.
- Necessary existing-code changes are allowed.
- There is no fixed delivery deadline; this is a PoC.

## Assumptions

- A documented effect with an unclear edge case can be interpreted from existing rules and analogous card text, then locked by an automated test.

## Out of Scope

- New gameplay features unrelated to documented card effects.
- External backend services or a separate rules engine.

## Open Questions

None.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-15T05:41:30Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | FR-002 / Acceptance criterion | 前回指摘が未解消。「各効果のトリガー・対象・結果をテストする」だけでは、62枚のどのカード／効果を、どの入力状態と期待結果で検証するかが要件から追跡できず、QAケース一覧を作れない。 | カードID・効果IDごとのトリガー、対象、処理順、期待状態／イベント、異常時を一覧化し、各行を自動テストへ対応付ける。 |
| 2 | Major | FR-004 | 前回指摘が未解消。「拒否または不発」は「適用されるルール」に委ねられ、対象不正・対象消滅・対象数不足など各境界での合否が未定義。実装者とQAが異なる挙動を選べる。 | 失敗条件ごとに reject / fizzle / 部分解決の判定と、状態を変更しない条件を明記する。 |
| 3 | Major | FR-005 | 前回指摘が未解消。「必要な場合」「影響を受けるカード」が列挙されず、持続時間、無効化、生成トークン、保留トリガーの適用範囲と完了条件を判断できない。 | 各機構を使用するカード／効果IDと、開始・更新・期限切れ・無効化・順序の受入条件を明示する。 |
| 4 | Major | FR-006 | 前回指摘が未解消。UI投影とCPUの合法手・対象検証を共有する要求はあるが、対象操作、共有ルール、拒否時のUI／CPUの期待結果が定義されていない。 | UI・CPU・エンジンの各経路について、代表的な合法／不合法ケースと一致すべき結果を受入条件にする。 |
| 5 | Minor | Non-Functional Requirements | 前回指摘が未解消。「決定的」「immutable」は観測可能な合否条件になっておらず、同一コマンドの再実行時に何を比較するか不明。 | 同一初期状態・同一コマンドでの状態／イベント列一致など、測定可能な条件を追記する。 |

### Summary

全62枚を対象にする境界、仕様書の優先順位、自動テストを完了条件とする方針は確認できる。一方、前回の主要指摘は要件本文で未解消であり、カード単位の期待結果、対象不正・持続効果・UI/CPU連携の適用範囲が実装とQAの判断に委ねられているため、承認前に補完が必要。
