**Collaborator:** aidlc-developer-agent

# Code Summary — card-effect-verification

## 対象選択 UI

- `PublicEffectChoice` を、ユニット、拠点、レーン、マス、墓地の候補と選択数で投影できるよう拡張した。対戦相手の非公開情報は候補に含めない。
- `battleInteraction` に `selecting-effect` 状態を追加し、候補の選択・取消・重複除去・必要数確認を行い、確定時に `BattleEffectSelection` へ正規化する。
- `useBattleController` は、対象不要のスペルを即時実行し、対象が必要なスペルと召喚時効果を共通の選択フローへ送る。確定後は `castSpell` または `summonCreature` の `effectSelection` に選択を渡す。
- 戦闘画面へ選択指示、候補・選択済み表示、確定・取消操作、テスト用 `data-testid` を追加した。
- AK-011/019/044/054/059 のスペルと、AK-038/042/046/048/057 の召喚時効果について、レーン、隣接・同一レーン、空き通常マス、墓地、重複、選択数の候補生成と command validation を同じ制約で照合する。

## 検証

- `tests/src/ui/battleScreen.test.tsx` を対象選択の確定フローに更新した。
- `npm run typecheck` — PASS
- `npm test` — PASS（33 files / 269 tests）

## 主要変更箇所

- 複合選択は種別ごとの必要数で確定可能性を判定する（`AK-019`: creature + coordinate、`AK-044`: lane + coordinates×3、`AK-059`: graveyard×2 + coordinates×2）。拒否時は下書きを保持して domain の理由を表示する。
- 墓地候補の表示名は連番のみとし、相手の非公開カード名を候補ラベルへ出さない。
- `AK-019` の相手盤面クリーチャー候補も匿名ラベル（`Opponent creature N`）にし、公開候補から相手カード名を除外した。

- `apps/web/src/battle/battleInteraction.ts`
- `apps/web/src/battle/useBattleController.ts`
- `apps/web/src/AppShell.tsx`
- `packages/domain/src/battle/{types,legalActions,projection,validation}.ts`
- `packages/ui/src/components/battle/{BattleInteractionControls,BattleScreen}.tsx`
- `tests/src/ui/battleScreen.test.tsx`
