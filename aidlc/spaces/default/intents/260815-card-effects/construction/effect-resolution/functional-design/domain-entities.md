# Domain Entities — effect-resolution

## Entities

| Entity | Attributes | Lifecycle |
| --- | --- | --- |
| EffectContext | immutable state、source、effect ID、selection、command ID、sequence、staged RNG | command ごとに生成 |
| EffectSelection | none/creatures/base/lane/cell/graveyard-card | command acceptance と resolution で検証 |
| EffectResolution | status、state、events、RNG、completed count、failure detail | resolved/fizzled/rejected で終端 |
| PendingTrigger | event ID、source、effect ID、snapshot、sequence、depth | enqueue から drain/拒否まで |
| Modifier | target、operator、value、source、duration、invalidation | 開始から expiry/invalidation まで |
| BattleEvent | event ID、sequence、effect ID、targets、typed data | primary operation または trigger で生成 |

## Relationships

`EffectContext` は catalog の definition を解決し、ordered operations が `BattleEvent` と `PendingTrigger` を生成する。`PendingTrigger` は drain 後に更なる `EffectResolution` を生成できる。`Modifier` は `BattleState` に保持され、投影時に effective value を導出する。

## Invariants

- 状態は immutable に置換され、操作途中の直接 mutation を公開しない。
- queue の順序は sequence と安定 tie-break で一意である。
- rejected resolution は events、state、RNG の差分を持たない。
- failure detail は partial resolution の失敗箇所を曖昧にしない。
