# Units of Work

## 根拠と境界

この分割は [要件](../requirements-analysis/requirements.md) と、[コンポーネント](../application-design/components.md)、[メソッド契約](../application-design/component-methods.md)、[サービス](../application-design/services.md)、[依存関係](../application-design/component-dependency.md)、[設計判断](../application-design/decisions.md) を実装可能な境界に変換する。既存の TypeScript モジュラーモノリス内のライブラリとして実装し、独立したサービスやデプロイ物は作らない。

## Unit Definitions

| Unit | Kind | 境界と責務 | 配布 | 複雑度 |
| --- | --- | --- | --- | --- |
| `effect-contract-catalog` | library | 62枚の正規マニフェスト、effect definition、静的カタログ snapshot、入力検証を所有する。仕様上効果なしのカードは実行用プレースホルダーを持たない。 | 既存 `packages/domain` に埋め込み | L |
| `effect-resolution` | library | 選択再検証、効果操作、持続修正、乱数、誘発キューおよび結果/イベントの決定的な解決を所有する。 | 既存 `packages/domain` に埋め込み | XL |
| `battle-effect-integration` | library | `GameEngine.submitCommand` と解決器を接続し、コマンド結果、状態コミット、公開候補、UI/CPU 共通の合法対象経路を所有する。 | 既存 `packages/domain` に埋め込み | L |
| `card-effect-verification` | library | 62枚それぞれのトリガー・対象・結果、拒否/不発、持続/誘発、UI/CPU 整合を自動テストで固定する。 | 既存テスト構成に埋め込み | XL |

## Unit Responsibilities

### effect-contract-catalog

- 仕様書のカード ID、テキスト、effect identity を 62 エントリで検証する。
- `EffectSelection`、`EffectResolution`、`BattleEventData`、`TriggerSpec` と static snapshot の実在型への適合を提供する。
- 欠落・重複・未知 ID・プレースホルダー・テキスト不一致を構築時に失敗させる。

### effect-resolution

- カード本文順の純粋操作、対象再検証、部分解決、不発、修正、期限切れ、無効化、トークン、決定的 RNG を実装する。
- イベントから誘発をスナップショットし、安定順序でキューを解消する。

### battle-effect-integration

- 既存 command を `EffectContext` に変換し、成功/不発/拒否を既存 command result に写像する。
- `BattleRngState` のトランザクション境界と `PublicEffectChoice` を接続し、UI と CPU が同じ合法候補だけを使うようにする。

### card-effect-verification

- カード ID/effect ID と仕様上の期待状態・イベントを対応付ける回帰テストを追加する。
- 不正対象、対象消滅、対象数不足、誘発順、持続終了、無効化、乱数再現性、UI/CPU/engine の一致を検証する。

## Constraints and Notes

- 仕様書が現行コードより優先される。
- 既存の五つの共鳴メカニクスを後退させない。
- すべての単位は immutable な `submitCommand` と既存テストの成功を維持する。
- 単位は依存トポロジのみを記録しており、実装優先順位は定めない。

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-15T06:37:11Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | unit-of-work.md:21,26,31-32; application-design/component-methods.md:19; application-design/decisions.md: Resolution Contracts / Final Integration Decisions 3, 5 | Unit が前提にする `EffectResolution` の rejected/partial failure と `BattleRngState`/`BattleCommandResult` の契約が、上流のコード例・決定事項で矛盾している。上流コード例は resolved/fizzled のみで `failedOperation` もなく、`EffectContext.rng` は `RngState` のままであるため、catalog/resolution/integration の境界を一意に実装できない。 | 上流 Application Design で resolution の全 variant・partial payload・消費規則・既存 command result への写像・RNG 型と commit 境界を一つの型契約に統合してから、各 unit の integration contract を同じ定義へ更新する。 |
| 2 | Major | unit-of-work-story-map.md:9-16,26; requirements.md: FR-002 acceptance criterion | FR-002 は各 documented effect の trigger/target/result を自動テストする要求だが、マップは FR 単位の6行と「カード/effect 単位」とだけ記し、62カード・各 effect ID・期待 state/event・異常系への割当を示していない。したがって verification unit の完了範囲と漏れを実装前に検証できない。 | authoritative 62-ID/effect inventory を入力として、カード/effect ごとの implementing unit、trigger、target、期待 state/event、reject/fizzle 等を表にし、テストケース識別子まで追跡する。 |
| 3 | Major | unit-of-work-dependency.md:27-29,31-44 | YAML DAG 自体は非循環である一方、`card-effect-verification` は3単位すべてに依存するのに、本文は catalog 完了後に検証テストを追加できると述べ、並行可能な unit 集合も列挙していない。これは 2.7 の topology と 2.8 の実装順序を混在させ、どの作業を独立に開始できるかを開発者に推測させる。 | DAG は直接依存だけに限定し、並行可能な antichain（例: catalog 前後で可能な検証サブ作業を別成果物として扱うか）を明示する。「完了後」「残り」など順序を示す文言と実装優先順位の記述を除去し、経済的な順序は 2.8 に移す。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc-sensor-required-sections.ts` | PASS: unit-of-work 4 H2、dependency 3 H2 / edge_block=ok、story-map 4 H2 | 必須見出しと YAML DAG の構文・非循環性は確認できたが、契約内容や粒度は検証しない。 |
| `aidlc-sensor-upstream-coverage.ts` | PASS: `components`, `component-methods`, `services`, `component-dependency`, `decisions`, `requirements` の未参照 0（`stories` は任意のため除外） | 上流参照の存在は確認できたが、上流契約の矛盾や要件ごとの実装完全性は保証しない。 |

### Summary

YAML DAG の単位名・kind・循環・直接依存は検証を通過している。しかし、単位が依存する上流型契約が矛盾し、全62枚の効果を検証する追跡表もなく、並行化記述が topology と実装順序を混同しているため、開発者が設計者への確認なしに Construction へ進める状態ではない。
