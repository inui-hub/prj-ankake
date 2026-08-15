# Business Rules — battle-effect-integration

## Command Mapping Rules

| Resolver result | Engine result | State/RNG |
| --- | --- | --- |
| rejected | existing rejection branch | input state と RNG を保持 |
| resolved | accepted success with effect status `resolved` | staged state/RNG/events を commit |
| fizzled | accepted success with effect status `fizzled` | documented consumption と既実行 draw のみ commit |

## Legal Target Rules

- `LegalTargetService` が UI、CPU、engine の共通候補源である。
- engine は公開候補由来の selection も resolution 直前に必ず再検証する。
- UI/CPU は engine が拒否する target を実行可能として表示または選択してはならない。
- public candidate は kind、stable ID、表示 label を持つが、権威は ID と domain validation にある。

## Integration Invariants

- engine 外で battle state を変更しない。
- result の effect status は completed operation count と failure detail を失わない。
- projection は commit 後の state と events から作る。
