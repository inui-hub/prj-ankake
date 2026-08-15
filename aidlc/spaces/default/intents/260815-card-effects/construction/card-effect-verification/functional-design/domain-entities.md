# Domain Entities — card-effect-verification

## Entities

| Entity | Attributes | Role |
| --- | --- | --- |
| EffectCoverageRow | card ID、effect ID、trigger、selection、expected state/event、edge cases | 仕様とテストの追跡 |
| BattleScenario | initial state、command、RNG seed | 再現可能な入力 |
| ExpectedResolution | status、state delta、events、RNG delta | assert 対象 |
| LegalActionScenario | actor、source、candidates、attempt | UI/CPU/engine 整合 |

## Relationships

`EffectCoverageRow` は一つ以上の `BattleScenario` と `ExpectedResolution` を持つ。`LegalActionScenario` は同じ row の選択契約を UI、CPU、engine に投影して比較する。

## Invariants

- row の card/effect identity は正規 catalog と一致する。
- scenario は仕様の trigger と target schema を満たす。
- expected event order は command 内の sequence 順で比較する。
