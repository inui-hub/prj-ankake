# Functional Design Questions — effect-resolution

## Q1. Ordered-operation failure policy

カード本文に複数の操作があり、途中の対象が不正になった場合はどう扱いますか？

- A. 各操作を順に再検証し、失敗操作は記録して、仕様が停止を指定しない限り後続操作を続ける
- B. 一つでも失敗したら全操作を rollback する
- C. 一つでも失敗したら残りを常に停止する
- X. Other (please specify)

[Answer]: A. 各操作を順に再検証し、失敗操作は記録して、仕様が停止を指定しない限り後続操作を続ける

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
