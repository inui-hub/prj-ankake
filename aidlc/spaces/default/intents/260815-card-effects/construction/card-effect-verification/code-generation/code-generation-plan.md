**Collaborator:** aidlc-developer-agent

# Code Generation Plan — card-effect-verification

## 対象選択 UI の追加

既存の `BattleEffectSelection` と engine の再検証を唯一の判定源にし、戦闘画面は選択値を収集して送るだけにする。カードごとの個別画面は作らず、すべての効果種別に共通の段階的な選択フローを追加する。

- [x] Step 1: `PublicEffectChoice` と公開戦闘ビューを拡張し、ユニット、拠点、レーン、マス、墓地、複数選択の必要数・候補・確定条件を UI に安全に投影する。既存の engine 側再検証を維持する。 (FR-004, FR-006)
- [x] Step 2: `apps/web/src/battle/battleInteraction.ts` に効果選択中の状態、選択の追加・取消・重複排除、候補不足・不正候補の表示、`BattleEffectSelection` への正規化を実装する。召喚・移動の既存フローを後退させない。 (FR-003, FR-004)
- [x] Step 3: `useBattleController` を接続し、スペルまたは召喚時に必要な選択を開始し、盤面・拠点・墓地の操作と確定時に `effectSelection` を含む command を送信する。選択不要のカードは従来どおり即時に実行する。 (FR-002, FR-006)
- [x] Step 4: `packages/ui` の戦闘コンポーネントへ選択指示、候補の視覚状態、選択済み一覧、確定・取消操作を追加する。対象となる操作には `data-testid` を付ける。 (FR-006)
- [x] Step 5: Web/UI テストを追加し、単一対象、複数対象、レーン／マス、墓地選択、取消、不正・不足選択、選択不要効果の即時実行を検証する。domain の公開候補と UI command が一致することを確認する。 (FR-002, FR-004, FR-006)
- [x] Step 6: `npm run typecheck` と `npm test` を実行し、既存の共鳴・戦闘操作・カード効果回帰を含めて確認する。 (NFR)

## 実装判断

- UI は合法候補だけを表示するが、確定時にも domain の command validation を必ず通す。
- 複数選択はカード本文が要求する個数を満たすまで確定不可にする。選択対象が途中で無効になった場合は再選択させ、engine が不正として拒否した場合は状態を破棄せず理由を表示する。
- CPU は既存の `getLegalActions` 経路を継続利用し、UI 固有の判断を追加しない。
