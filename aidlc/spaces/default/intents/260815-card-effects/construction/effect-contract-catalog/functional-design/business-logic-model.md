# Business Logic Model — effect-contract-catalog

## Context and Inputs

この単位は [unit-of-work](../../../inception/units-generation/unit-of-work.md) と [unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md) の `effect-contract-catalog` を実現する。対象は [requirements](../../../inception/requirements-analysis/requirements.md) の FR-001 と、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) に定義された静的カタログ境界である。

## Build Workflow

1. 仕様書から固定した 60 通常カードと 2 トークンの入力を読み込む。
2. 各 ID を一度だけ検証し、カード本文・version・effect identity・`none` 定義を正規化する。
3. `effectIds` を ordered effect definitions へ解決し、効果なしカードは実行用 ID を作らない。
4. 既存 `buildStaticCatalogSnapshot` が record map と effect definition map を同時に構築する。
5. 欠落・余剰・重複・不正な ID、本文不一致、placeholder、effect 定義不一致は snapshot を返さず構造化 issue を返す。

## State Transformation

入力 `StaticCatalogInput` は検証成功時に不変の `StaticCatalogSnapshot` へ変換される。snapshot は既存の `cardsById` と `tokensById` を保持し、card/token ID を ordered effect definitions または `none` に対応付ける。後続の解決器は raw JSON を読まず snapshot のみを参照する。

## Failure Semantics

カタログ構築の失敗はプレイ中の不発ではない。いずれかの issue がある場合、snapshot 全体を拒否し、部分的な effect map を公開しない。既存カード・トークン件数の検証は維持する。

## Confirmation

仕様書優先の解釈方針を人が確認済みである。

## Concrete Catalog Contract

`StaticCatalogInput` は既存 cards/tokens/version に加え、仕様抽出済みの `effectManifest` を受け取る。manifest は各 card ID について `{ cardId, textDigest, effects: EffectDefinition[] | "none" }` を持つ。`buildStaticCatalogSnapshot` は既存 record maps と `effectsByCardId: ReadonlyMap<string, EffectDefinition[] | "none">` を同時に生成する。build failure は既存 issue に `catalog.effect-manifest.missing`、`unknown-card`、`text-mismatch`、`definition-missing`、`placeholder`、`none-has-definition` を追加し、issues 非空なら snapshot を返さない。resolver はこの snapshot の map だけを参照する。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T07:00:03Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | business-logic-model.md:27-29; packages/domain/src/catalog/types.ts:50-64,66-87; catalog/snapshot.ts:8-31 | 改訂契約が要求する `effectManifest`、`effectsByCardId`、6つの新 issue code は実装の型・build 経路・issue union に存在しない。`buildStaticCatalogSnapshot` は現状 `cards/tokens/version` だけを受け、record map だけを返すため、契約をそのまま実装すると `StaticAssetPayload`/startupOrchestrator まで入力境界を変更する必要がある。 | `EffectManifest`、`EffectDefinition`、snapshot map、全 issue code を実在 export として定義し、asset payload から startup 呼び出しまでの構築 API と移行を明記する。 |
| 2 | Major | business-logic-model.md:9-13,27-29; packages/domain/src/catalog/validation.ts:19-47,157-171; apps/web/public/data/cards.json:1-40 | canonical manifest の生成元・62行の内容・`textDigest` 算出規則・version との対応が未定義で、コード側にも manifest 入力はない。さらに現行 JSON は AK-002 以降に `Battle effect placeholder ...` を持つが、validator は placeholder を拒否せず、改訂契約の placeholder/text-mismatch 検査を再現できない。 | 再現可能な manifest ファイルまたは生成手順（全 ID、本文、version、no-effect、digest algorithm）を成果物に固定し、JSON/manifest の読み込みと placeholder・本文比較の検証順序を定義する。 |
| 3 | Major | business-logic-model.md:11,17,29; domain-entities.md:8-19; components.md:7; component-methods.md:17-19 | `effects: EffectDefinition[] | "none"` とだけ記載され、`EffectDefinition` の effect ID、trigger、target、operation の具体的な discriminated union、順序・重複・未知 IDの扱いがない。上流の `EffectCatalog.getEffectDefinition(effectId)` と resolver の `EffectSelection`/`EffectResolution` が何を受け取るか一意に決められず、後続 unit が実装者判断になる。 | definition の完全な型と全 field 制約、effectIds→registry→entry の解決アルゴリズム、unknown/duplicate/none の issue と snapshot canonical form を表で契約化する。 |
| 4 | Major | business-logic-model.md:17,29; unit-of-work.md:35-37; components.md:7-16 | この unit の責務に含まれる「実在型への適合」が改訂契約から消え、`EffectSelection` 互換の target、`EffectResolution` の結果 variant、`BattleEventData`/`TriggerSpec` への export・依存方向が未記載のままである。上流 component-methods の `EffectResolution`（resolved/fizzled）と決定事項の rejected/partial failure 矛盾も解消されず、catalog 定義の operation を resolver が解釈できる境界がない。 | catalog-owned と resolver-owned の型境界・export と、trigger/target/operation から event/result への写像を上流契約と同じ型定義に統合する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `bun .codex/tools/aidlc-sensor-required-sections.ts --stage functional-design --output-path business-logic-model.md` | PASS (`h2_count=7`, `findings_count=0`) | 文書構造のみ検証し、型・実装整合性は検証しない。 |
| `bun .codex/tools/aidlc-sensor-upstream-coverage.ts --stage functional-design --output-path business-logic-model.md` | PASS (`consumes=[]`, `findings_count=0`, `reason=no upstream`) | この単独ファイルに上流消費パスがないため、参照先契約の矛盾を検知していない。 |
| linter / type-check sensors | SKIPPED (Markdown filter) | TypeScript/TSX スニペットがなく、改訂契約の実在型検証は未実施。 |

### Summary

前回の型・manifest・ID 解決の不足は Concrete Catalog Contract の追加で方向性は示されたが、実装の現行 API と依然不一致で、manifest の再現可能な内容と effect definition の実行スキーマも欠けている。4件の Major により、開発者は asset 入力境界と resolver 型を設計者へ確認せず実装できないため NOT-READY とする。
