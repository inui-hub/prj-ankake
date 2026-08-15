**Collaborator:** aidlc-developer-agent

# Code Generation Plan — battle-effect-integration

- [x] Step 1: 既存の `GameEngine`、`legalActions`、projection、CPU/UI command path と先行 resolver/catalog 実装を確認する。
- [x] Step 2: 現行 resolver で表現できる document effect を executable play program に限定変換する（FR-002）。
- [x] Step 3: 同じ legal target query を public choice、CPU の legal action、engine の再検証で共有する（FR-004）。
- [x] Step 4: `castSpell` を resolver に接続し、accepted result の effect status・events・state を command transaction に含める（FR-002 / FR-003）。
- [x] Step 5: stale target rejection と共通候補経路を統合テストし、typecheck と全 test を実行する（FR-004 / FR-006）。

## Scope Boundary

現行 catalog は `documented` operation のみで、UI には target-selection interaction がない。したがって、単体対象のダメージ／回復という resolver が実行可能な spell subset を統合し、未モデルの効果・召喚／破壊 trigger・UI の対象選択画面はこの unit では追加しない。
