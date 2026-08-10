## コード構造

| 範囲 | 分類 | 責務 |
|---|---|---|
| `packages/domain/src/battle/` | domain model / rules | 状態、盤面、検証、召喚、移動、攻撃、自動処理、投影、共鳴 |
| `packages/cpu/src/` | application service | 公開可能状態から CPU command を選ぶ |
| `packages/persistence/src/decks/` | repository adapter | デッキのシリアライズと IndexedDB 永続化 |
| `packages/ui/src/components/battle/` | React presentation | 盤面、手札、対戦情報、ログ、操作の表示 |
| `apps/web/src/battle/` | application adapter | controller、runtime service、UI interaction の統合 |
| `tests/src/` | verification | domain、アプリ、UI、property テスト |

## 共鳴の関係ファイル

- `battle/types.ts`: `ResonanceMap` と `PlayerBattleState.resonance`、イベント型を定義する。
- `battle/constants.ts`: `RESONANCE_MAX = 10`、`RESONANCE_ACTIVE_THRESHOLD = 5` を定義する。
- `battle/resonance.ts`: 空マップ、加算、全値減衰、クランプを提供する。
- `battle/stateFactory.ts`: 両者に空の共鳴マップを生成する。
- `battle/engine.ts`: 召喚確定後、現コストに基づく加算と `resonance.changed` を発行する。
- `battle/automaticPhases.ts`: 減衰・使用状態リセットの追加位置である。
- `battle/projection.ts`: UI 用共鳴表示を加える唯一の投影境界である。
- `packages/ui/src/components/battle/BattlePanels.tsx`: 仕様の共鳴パネルを実装する表示境界である。

## コードパターン

domain は readonly 型と不変更新を採用し、`GameEngine.submitCommand` が入力検証の境界となる。共鳴実装もこの規律を保ち、UI の条件分岐ではなく domain の state transition と投影型を変更する必要がある。
