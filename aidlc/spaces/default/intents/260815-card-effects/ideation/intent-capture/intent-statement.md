# Intent Statement

## Sources

- [desc] Initial description: "カード効果を実装してください。"
- [scope] Workflow-selected scope: `card-effects-implementation`.
- [Q1] `intent-capture-questions.md#Q1`: "全62枚（通常カード60枚とトークンカード2枚）のカード効果を仕様書どおりに実装する。"
- [Q3] `intent-capture-questions.md#Q3`: "仕様書に定義された全62枚の効果が実装されること。"
- [Q4] `intent-capture-questions.md#Q4`: "`docs` の仕様書に基づく未実装のカード効果を実装する必要がある。"
- [Q5] `intent-capture-questions.md#Q5`: "`docs` の仕様書を確認し、通常カード60枚とトークンカード2枚の全効果を、既存コードに適した方法で実装する。"
- [Q8] `intent-capture-questions.md#Q8`: "はい。全62枚のカード効果を実装する境界として合っている。"

## Problem Statement

`docs` に定義されている未実装のカード効果を実装し、ゲームのカード仕様と実際の挙動を一致させる。 [Q1] [Q4] [Q5]

## Target Customer

対象者は現時点で特定されていない。 [Q2]

## Success Metrics

通常カード60枚とトークンカード2枚、合計62枚について、仕様書に定義された効果が実装されていることを完了条件とする。 [Q3] [Q5]

## Initiative Trigger

`docs` にある仕様書に基づき、未実装のカード効果を実装する必要がある。 [Q4]

## Initial Scope Signal

ワークフローで選択された範囲は `card-effects-implementation` である。これは、全62枚のカード効果を実装するというユーザー確認済みの成果境界と整合する。 [scope] [Q8]

## Assumptions & Open Questions

None.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-08-15T05:06:32Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | Q5 / Success Metrics | 対象は「docs の仕様書」とカード枚数しか示されておらず、62枚それぞれの発動条件・対象・結果・例外が成果物にない。開発者は実装内容を確定できず、QAも合否を判定できない。 | 仕様書の具体的なパス／版を明記し、62枚のカードIDと各効果（発動条件・対象・結果・境界条件）を参照可能な形で登録する。 |
| 2 | Major | Success Metrics | 「効果が実装されている」は検証可能な合否条件ではなく、仕様準拠の確認方法（例：カードごとの自動テスト、期待結果、未実装・異常時の扱い）が定義されていない。 [Q3] | カードごとに仕様ケースと期待結果を対応付け、全62枚が pass すること、失敗時の扱い、テスト実行を完了条件として明記する。 |
| 3 | Major | Problem Statement | 「ゲームのカード仕様と実際の挙動を一致させる」は質問票の回答に明記されていない成果主張であり、[Q1] [Q4] [Q5] は実装の必要性しか裏付けていない。 | この成果を人が確認した事実として質問票に追加するか、意図文では「仕様書どおりに実装する」という確認済み表現に限定する。 |
| 4 | Major | Target Customer / Stakeholder Map | 対象者と範囲・優先度の決定者が未特定のまま [Q2] [Q6] で確定されておらず、誰が仕様差異や完了を受け入れるか判断できない。 | 少なくとも受入責任者（または決定者）と主対象ユーザーを特定し、未定なら次段階で確定する期限・判断方法を Open Questions に記録する。 |

### Summary

全62枚という件数と大枠の境界は確認できるが、個別効果の参照可能な仕様とテスト可能な成功条件がなく、現状では実装・受入を開始できない。対象者・決定者も未確定であるため、仕様の確定と受入責任の明記が必要。
