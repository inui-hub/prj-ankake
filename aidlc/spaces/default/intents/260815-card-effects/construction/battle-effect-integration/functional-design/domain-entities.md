# Domain Entities — battle-effect-integration

## Entities

| Entity | Role | Ownership |
| --- | --- | --- |
| EffectCommand | source instance、effect ID、selection を運ぶ入力 | caller から engine |
| PublicEffectChoice | effect ID、source、selection kinds、candidates | projection |
| LegalTargets | candidate IDs と selection constraints | domain validation |
| BattleCommandResult | accepted/rejected と effect status | GameEngine |
| BattleEventData | effect ID、target IDs、resolution detail | event log |

## Relationships

`EffectCommand` は `LegalTargets` と同じ validation 規則で `EffectContext` へ変換される。`BattleCommandResult` は `EffectResolution` を既存結果型へ写像し、`BattleEventData` と `PublicEffectChoice` が commit 後の振る舞いを外部へ伝える。

## Invariants

- public candidate は stale になり得るため engine 再検証を代替しない。
- accepted/rejected の境界は state と RNG の commit 境界と一致する。
- CPU と UI は同じ candidate schema を利用する。
