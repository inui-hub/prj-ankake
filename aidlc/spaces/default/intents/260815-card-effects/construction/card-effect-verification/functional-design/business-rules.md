# Business Rules — card-effect-verification

## Coverage Rules

- 62枚の全 ID をちょうど一度 matrix に載せる。
- 効果あり card は effect ID ごとに少なくとも一つの trigger/target/result test を持つ。
- 効果なし card は executable effect が存在しないことを検証する。
- spell、summon、destruction、movement、continuous、duration、token、trigger を使用する効果は該当する lifecycle test を持つ。

## Edge-case Rules

- invalid/stale target、target shortage、duplicate target、source destruction、trigger loop、RNG candidate absence を検証する。
- UI、CPU、engine の各経路で legal candidates と拒否結果を一致させる。
- 既存の共鳴五種と既存 suite が後退しないことを確認する。

## Determinism Rule

同一 initial state、command、RNG seed は同一 state と ordered events を返さなければならない。
