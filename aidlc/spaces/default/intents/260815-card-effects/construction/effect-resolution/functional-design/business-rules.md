# Business Rules — effect-resolution

## Target and Failure Rules

| 状況 | 結果 |
| --- | --- |
| command 時に不正な selection | rejected、state/RNG を変更しない |
| resolution 時に対象が消滅または不正 | fizzled または operation failure。本文の消費規則を適用 |
| 対象数不足 | operation failure を記録し、本文が停止を定めない限り後続を継続 |
| 重複 target | stable instance ID で重複除去後に必要数を検査 |
| random candidate なし | documented fizzle。draw は行わず RNG を進めない |

## Trigger and Modifier Rules

- trigger は registry が許可した event type だけから作る。
- trigger snapshot は生成時点の source、target、controller を保持する。
- drain 中に生じた trigger は現在要素の後ろへ追加する。
- `triggerEventId/sourceInstanceId/effectId` の visited key は重複再入を防ぐ。
- modifier は base value を上書きせず、開始順で合成し、期限・無効化時に導出値から除外する。

## Transaction Rules

accepted resolution だけが staged RNG を commit する。rejected は元の RNG を保持する。fizzled はカード本文で既に行った draw のみ commit し、draw 未実行なら RNG は不変である。
