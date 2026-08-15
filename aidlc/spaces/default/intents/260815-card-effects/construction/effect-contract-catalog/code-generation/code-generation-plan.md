**Collaborator:** aidlc-developer-agent

# Code Generation Plan — effect-contract-catalog

- [x] Step 1: `EffectManifest`、宣言的な `EffectDefinition`、snapshot lookup の型を追加する（FR-001）。
- [x] Step 2: 仕様書 `project_ankake_all_cards_v1_1.md` を転記した62件の正規 manifest を domain catalog に固定する（FR-001）。
- [x] Step 3: manifest のID、本文digest、定義順、`none`、placeholder を検証し、失敗時に snapshot を公開しない（FR-001）。
- [x] Step 4: 既存のカード・トークンmapを保ったまま `effectsByCardId` を snapshot に追加する（FR-001）。
- [x] Step 5: 62件lookup、`none`、placeholder 拒否を unit test に追加する（FR-001）。
- [x] Step 6: domain typecheck と全 Vitest suite を実行する（FR-001）。

## Scope Boundary

resolver、GameEngine、startup asset client は変更しない。既存assetは placeholder 本文を含むため、manifestを渡す構築者が正規本文へ移行するまでの互換性として、manifest 未指定の旧構築経路を維持する。

