# Unit of Work Story Map

## Source Mapping

ユーザーストーリー工程はこのスコープでは実行されなかったため、ストーリーの代わりに [要件](../requirements-analysis/requirements.md) の検証可能な機能要求を実装単位へ割り当てる。設計上のコンポーネント、メソッド、サービス、依存関係、判断はそれぞれ [components](../application-design/components.md)、[component-methods](../application-design/component-methods.md)、[services](../application-design/services.md)、[component-dependency](../application-design/component-dependency.md)、[decisions](../application-design/decisions.md) を参照する。

## Requirement-to-Unit Coverage

| Requirement / story equivalent | Implementing units | 完了の観測点 |
| --- | --- | --- |
| FR-001: 62枚の静的カタログ | effect-contract-catalog, card-effect-verification | 62 ID 検証と no-effect 正規化 |
| FR-002: 全効果のトリガー・対象・結果 | effect-resolution, battle-effect-integration, card-effect-verification | カード/effect 単位の自動テスト |
| FR-003: spell/summon/destruction/movement/continuous/duration | effect-resolution, battle-effect-integration, card-effect-verification | 本文順の state/event と再現可能な結果 |
| FR-004: 対象検証と再検証 | effect-resolution, battle-effect-integration, card-effect-verification | reject/fizzle と状態保全 |
| FR-005: modifier/duration/invalidation/token/trigger | effect-resolution, card-effect-verification | 期限・無効化・誘発順序のテスト |
| FR-006: UI/CPU と engine の共通合法性 | battle-effect-integration, card-effect-verification | 同一候補と拒否結果の一致 |

## Cross-Cutting Coverage

- `effect-contract-catalog` と `effect-resolution` は、effect definition と実行規則を共有する。
- `effect-resolution` と `battle-effect-integration` は、状態・イベント・RNG を共有する。
- `card-effect-verification` は全単位を横断して、仕様書の解釈を回帰テストとして固定する。

## Coverage Verification

すべての要件相当の振る舞いを少なくとも一つの単位に割り当て、すべての単位に少なくとも一つの検証可能な責務を割り当てた。個別のカード/効果 ID のテスト行は `card-effect-verification` の成果物で保持する。
