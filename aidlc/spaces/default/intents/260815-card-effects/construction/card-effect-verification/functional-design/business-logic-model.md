# Business Logic Model — card-effect-verification

## Context

この単位は [unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md) の FR-001〜FR-006 を証明する。[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) の公開契約を観測する。

## Verification Workflow

1. 仕様書から62 ID の effect coverage matrix を生成・検証する。
2. 各 card/effect row に trigger、初期 state、selection、期待 state/event、reject/fizzle/partial の期待を記録する。
3. domain test は command を submit し、state、event sequence、RNG、modifier、token、pending trigger を比較する。
4. UI/CPU test は同一 `PublicEffectChoice` を利用し、engine と合法/不合法の結果が一致することを比較する。
5. 同一 initial state と command の再実行で同一 state/event sequence を得ることを確認する。

## Failure Reporting

coverage matrix に card ID/effect ID が欠ける、重複する、期待結果を持たない場合はテスト suite を失敗させる。仕様の曖昧な箇所は採用解釈と回帰テストを同じ row に記録する。

## Coverage Matrix Contract

`card-effect-coverage.ts` は62 ID を列挙する `EffectCoverageRow[]` を export する。各 row は `testId`、`cardId`、`effectId | "none"`、`trigger`、`initialStateFixture`、`selection`、`expectedState`、`expectedEvents`、`edgeCases` を必須とする。test harness は fixture builder、`submitCommand` executor、state/event/RNG comparator、public-choice comparator を提供する。`none` row は executable definition が存在しないことを assert する。coverage test は manifest と matrix の ID/effect ID 集合の完全一致を assert する。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T06:55:57Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | business-logic-model.md: Verification Workflow 3-4; inception/application-design/component-methods.md: Execution Contract | 本設計は `rejected`、partial operation、`BattleRngState` を観測対象にするが、上流の `EffectResolution` 型は `resolved`/`fizzled` の2 variant しか定義せず、`EffectContext.rng` も `RngState`。したがって検証テストが何を受け取り、reject/partial/RNG commit をどう assert するかを実装者が一意に決められない。 | 上流契約を先に統合し、全 resolution variant・partial failure payload・RNG 型/消費・`submitCommand` の結果写像を確定した型と fixture として参照する。 |
| 2 | Major | business-logic-model.md: Verification Workflow 1-2; inception/units-generation/unit-of-work-story-map.md: Coverage Verification | 「62 ID の coverage matrix を生成」と書かれているだけで、matrix の成果物パス、62カード/effect ID の authoritative inventory、各行の test case ID、trigger/target/期待 state/event の具体的割当が存在しない。FR-002 を漏れなく実装・レビューする追跡基盤になっていない。 | 62枚を列挙した versioned matrix を本ユニットの成果物に追加し、各行を fixture/test ID と一対一に結び付け、欠落・重複を CI で検証する。 |
| 3 | Major | business-logic-model.md: Verification Workflow 3-5; inception/application-design/services.md: DTO and Queue Schema | UI/CPU/engine の一致、trigger queue、RNG、modifier、token を比較するとあるが、検証側が呼び出す公開 API、初期 state fixture、command/selection の生成方法、event ordering と queue depth/loop の期待値が未定義。特に `PublicEffectChoice` は DTO の形だけで、engine result への比較写像がないため、テスト実装が独自解釈になる。 | 経路ごとの test harness 契約（入力、呼出し API、期待結果 schema、拒否/fizzle/loop の判定）と、代表的な fixture/比較キーを明記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor-required-sections.ts` | PASS: 3 H2 headings (`Context`, `Verification Workflow`, `Failure Reporting`) | 文書の最小構造は満たすが、契約整合性や62枚の網羅性は検証しない。 |
| `aidlc-sensor-upstream-coverage.ts` | PASS: no upstream context supplied in direct invocation (`consumes: []`) | この直接実行では upstream path が注入されず、上流参照の完全性を判定できない。上流契約の矛盾は本文照合で確認した。 |

### Summary

検証方針と失敗カテゴリは列挙されているが、上流の resolution 契約が矛盾し、62枚の実体的な追跡表とテスト harness 契約もない。現状では開発者が設計者への確認なしに、reject/partial/RNG と UI/CPU/engine の期待結果を実装できないため NOT-READY。
