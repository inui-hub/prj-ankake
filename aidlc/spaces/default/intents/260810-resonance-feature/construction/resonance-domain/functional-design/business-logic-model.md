# 共鳴ドメインモデル
## State
レーン×属性の0〜10値と、属性・レーン別使用状態を不変の `BattleState` に保持する。
## Transitions
カード発動、ターン開始、破壊、アタック終了が transaction 内で共鳴を更新する。
