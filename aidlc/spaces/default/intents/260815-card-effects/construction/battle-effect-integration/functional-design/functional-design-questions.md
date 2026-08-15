# Functional Design Questions — battle-effect-integration

## Q1. Legal-target source

UI、CPU、engine が対象の合法性を判定する際、どの経路を唯一の正としますか？

- A. domain の `LegalTargetService` と engine の再検証を共通利用する
- B. UI と CPU が独自に候補を計算する
- C. UI が候補を決め、engine は再検証しない
- X. Other (please specify)

[Answer]: A. domain の `LegalTargetService` と engine の再検証を共通利用する

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
