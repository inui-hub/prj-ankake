# 詳細設計確認

## Q1. 共鳴値は `BattleState` 内で管理し、すべての更新を既存 transaction から行う設計でよいですか？

A. はい
B. 別の状態ストアに分離する
C. Not yet defined
X. Other (please specify)

[Answer]: A. はい

## Consolidated Summary Confirmation

- 共鳴値は `BattleState` 内で管理し、既存 transaction を通じて更新する

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
