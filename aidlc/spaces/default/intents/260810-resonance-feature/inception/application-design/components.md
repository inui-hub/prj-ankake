# コンポーネント設計
## Battle Resonance
`BattleState` 内で共鳴値、閾値、使用状態を所有する。既存の battle transaction が唯一の更新境界である。
## UI Projection
対戦画面は状態を参照し、値・状態・使用可能操作を描画する。
