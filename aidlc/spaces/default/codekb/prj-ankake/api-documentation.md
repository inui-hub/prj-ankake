## 外部 API

ネットワーク API、認証、サーバーエンドポイントは発見されなかった。カード／トークン／バージョンは Vite public asset の JSON から読み、デッキはブラウザ IndexedDB に保存する。

## 現在の内部 API

| API | 現在の契約 | 共鳴上の差分 |
|---|---|---|
| `GameEngine.submitCommand(state, command)` | 検証済み command を `BattleCommandResult`（state/events または issues）へ変換 | `useResonanceEffect` command が存在しない |
| `createBattleState(input)` | デッキ・カタログ・先攻設定から初期 state を作成 | 15 値はゼロで初期化するが、使用済み状態を持たない |
| `increaseResonance(map, lane, attribute, amount)` | 負値を無視し 0–10 にクランプして指定セルを更新 | caller が加算量規則を保証する必要がある |
| `decayResonance(map)` | 全セルを 1 減衰 | 実行フローへ未接続 |
| `projectPublicBattleView(state)` | UI 安全な投影を作成 | 共鳴値・状態・操作可否を含まない |

## 推奨する契約拡張

`resonance.changed` の `data` は少なくとも `lane`、`attribute`、`before`、`after`、`reason`、`becameActive`、`becameInactive` を含める。これにより UI がメッセージ文を解析せず、ログと閾値アニメーションを一貫して処理できる。

対象選択型の水共鳴を実装する場合、`BattleCommand` に side/lane/attribute/target instance ID を明示する command を加える。検証は active side、閾値、レーン一致、当ターン未使用、味方クリーチャー、対象の存在を domain で拒否する。UI はこの公開結果を表示するが、規則を再実装しない。

## 公開投影契約

`PublicBattleView` には両 side のレーン×属性セルを追加する。各セルは value、active、effect type、turn usage、human player の操作可否を持つ表示用値とする。内部の全 `BattleState` や未公開のカード情報を露出しないことを維持する。
