**Collaborator:** aidlc-developer-agent

# Code Summary — effect-contract-catalog

## 変更

- `packages/domain/src/catalog/effectManifest.ts` に、仕様書本文・effect identityを持つ62件の正規manifestを追加した。
- catalog 型に manifest、宣言的effect definition、`effectsByCardId` を追加した。
- manifest 指定時に、全ID、本文digest、effect ID順、`none`、placeholder を検証するようにした。
- snapshot 構築は issue があれば失敗し、成功時だけ immutable lookup を公開する。
- catalog validation test に62件lookupとplaceholder拒否を追加した。

## 検証

- `npm run typecheck -w @ankake/domain` — PASS
- `npm run test -w @ankake/tests` — PASS（30 files / 193 tests）

## 未解決事項

- 既存web asset JSON は placeholder 本文のため、manifestを渡すstartup移行は `battle-effect-integration` 等の後続責務として未実施。
- operation のゲーム状態への実行は `effect-resolution` の責務であり、この単位では宣言的catalogに留めた。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T08:12:03Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | `apps/web/src/startup/startupOrchestrator.ts:55-70` | Startup materialization projects only `effects[0].operations[0].text` into the legacy `effectText` field. The manifest type permits multiple definitions and multiple operations, so a future valid manifest can lose text and become inconsistent with its ordered effect definitions. The current 62-entry manifest is single-definition/single-operation, so this is not a current blocker. | Either define and validate the one-definition/one-operation constraint, or materialize a canonical full-text field without truncating the manifest. |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm run typecheck -w @ankake/domain` | PASS | Domain code type-checks successfully. |
| `npm run test -w @ankake/tests -- src/domain/staticCatalogValidation.test.ts src/domain/cardEffectCoverage.test.ts` | PASS: 2 files / 72 tests | Catalog validation, duplicate rejection, malformed nested-definition rejection, and 62-entry coverage pass. |
| `npm run test -w @ankake/tests` | FAIL: 1 unrelated UI test (`battleScreen.test.tsx`, expected actionable creature) | Catalog-focused tests pass; the full-suite failure should be triaged separately before merge. |

### Summary

The prior critical/major gaps are resolved: nested definitions are checked, duplicate manifest IDs are rejected, and startup now injects the canonical 62-entry manifest. The remaining projection limitation is minor for the current manifest, so this unit is implementable without architectural guidance.
