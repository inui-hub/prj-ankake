**Collaborator:** aidlc-developer-agent

# Code Summary — battle-effect-integration

## 変更

- `effectPrograms.ts` を追加し、現行 resolver が表現できる canonical spell text を executable operation に限定変換した。
- `castSpell` に creature/base target を追加し、validation が shared legal target query により commit 前に再検証するようにした。
- `GameEngine` は validated spell の resolver result を state、ordered events、effect status として commit する。stale target は spell 消費前に既存の rejection result へ戻る。
- `getPublicEffectChoices` を追加し、public projection と CPU legal action が同じ candidate source を使うようにした。
- integration test は public candidate、generated legal command、engine resolution、および stale rejection を検証する。

## 検証

- `npm run test --workspace=@ankake/tests -- --run src/domain/battleEffectIntegration.test.ts` — PASS（1 file / 2 tests）
- `npm run typecheck` — PASS

## 制約

- 現在の catalog 定義は実行 program ではないため、未モデルの document effect は従来どおり intrinsic effect なしで cast される。
- UI は effect choice を projection で受け取れるが、対象選択 interaction をまだ描画しない。CPU は generated legal action を通じてこの subset を選択できる。
