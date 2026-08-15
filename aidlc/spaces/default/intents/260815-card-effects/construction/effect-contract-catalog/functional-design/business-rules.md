# Business Rules — effect-contract-catalog

## Coverage Rules

- 正規 ID 集合は `AK-001` から `AK-060`、`AK-T-001`、`AK-T-002` の62件である。
- 各 ID は一度だけ出現し、型（通常カードまたはトークン）と deck-buildable の既存制約を満たす。
- 仕様で効果なしとされるカードは `none` と明示し、placeholder effect ID は禁止する。
- 効果を持つカードは本文、version、順序付き effect IDs と effect definition が一致しなければならない。

## Validation Rules

| 条件 | 結果 |
| --- | --- |
| ID の欠落・余剰・重複 | build failure |
| effect text の欠落または仕様本文との不一致 | build failure |
| `effectIds` が未定義 definition を参照 | build failure |
| 効果あり本文に empty/placeholder ID | build failure |
| `none` カードに executable definition | build failure |
| 有効な62件と定義の完全対応 | immutable snapshot を公開 |

## Compatibility Rules

既存の `cardsById`、`tokensById`、通常カード数、トークン数、version metadata の公開契約は保持する。新しい effect lookup はこれらを置換せず、同じ snapshot 内の追加索引とする。

## Confirmation

各ルールは仕様書優先の解釈方針で確定した。
