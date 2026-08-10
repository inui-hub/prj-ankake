## コンポーネント一覧

| 境界 | コンポーネント | 責務 | 健全性 | 共鳴への影響 |
|---|---|---|---|---|
| Battle Domain | `GameEngine` | コマンド検証後の状態遷移とイベント列 | 要改善 | 召喚時加算はあるが、共鳴専用 command と効果 orchestration がない |
| Battle Domain | `resonance.ts` / `ResonanceMap` | 15 セル初期化、加算、減衰、クランプ | 健全 | 値操作は再利用可能。ただし active 判定、使用状態、効果 policy を持たない |
| Battle Domain | `automaticPhases.ts` | 攻撃後のターン交代、PP 回復、ドロー | 要改善 | `decayResonance` を呼ばず、光効果の解決点もない |
| Battle Domain | `effects.ts` / attack / terminal | スペル、攻撃、破壊、終了条件 | 要改善 | スペル加算、闇の破壊後トークン、光の回復を接続する拡張点 |
| Battle Domain | state factory / types | 不変状態と初期化 | 健全 | 共鳴マップは初期化済み。使用済み・一時効果を表す型追加が必要 |
| Boundary | `projection.ts` | 内部状態を `PublicBattleView` に変換 | 要改善 | 共鳴が意図的に非公開で、UI 必須情報を欠く |
| Application | controller / runtime service | UI 操作、CPU 実行、ログの統合 | 健全 | 新 command と構造化イベントを透過する変更が必要 |
| Presentation | `BattleScreen` / `BattleInfoPanels` | 対戦表示・入力 | 要改善 | 仕様の共鳴タブ、3×5 表、使用操作、閾値視覚化がない |
| CPU | `packages/cpu` | 可視状態から合法手を選ぶ | 確認要 | 共鳴効果 command を合法手集合へ追加し、CPU 用投影／戦略を更新する |
| Persistence | DeckRepository | IndexedDB デッキ保存 | 健全 | 対戦中の共鳴状態を保存しないため、本機能の直接変更対象外 |

## 推奨する共鳴サブシステム境界

`packages/domain/src/battle/resonance/`（既存の単一 `resonance.ts` から段階的に分割可能）に、値マップ、状態照会、使用回数、コスト／能力修正、ライフサイクル解決を凝集する。公開するのは `GameEngine` と phases/effects が必要とする関数だけとし、React コンポーネントが `BattleState` を直接読み替えない。

## 実装への波及順

1. domain 型・不変状態・イベント契約を拡張する。
2. summon/spell/standby/attack/destruction の state transition に共鳴 lifecycle を接続する。
3. projection と UI を表示専用契約で更新する。
4. command、検証、CPU 合法手を対象選択効果へ対応させる。
5. domain 単体・性質テスト、アプリ統合、UI 表示テストを追加する。
