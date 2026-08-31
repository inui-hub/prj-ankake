# Build and Test 実行結果

## 実行結果

| コマンド | 結果 | 根拠 |
| --- | --- | --- |
| `npm run typecheck` | PASS | 全 workspace の TypeScript 静的検証が成功 |
| `npm run lint` | PASS | root lint script（全 workspace の TypeScript 静的検証）が成功 |
| `npm test -- --run` | PASS | Vitest 全 suite が成功（33 files / 296 tests） |

上記は `code-summary.md` の最終検証と review の validation tool results に記録された成功結果である。今回の Build and Test 文書作成時にはコードを変更せず、コマンドを再実行していないため、ここに新たな実行時刻・coverage・失敗ログはない。

## 検証内容

- FR-1: 日本語初期表示、日英切替、カード・ダイアログのフォールバック。
- FR-2: `cost:asc`、locale 依存の同コスト順、ID 副キー、リセット。
- FR-3〜FR-5: 盤面の data 属性、拠点 accessible name、カード情報、5×3 共鳴 table、`0` フォールバック。
- FR-6: 水共鳴候補、click/Enter/Space command、失敗 code の status、state 不変条件。

## 未計測・注意事項

coverage レポート、skip 件数、production bundle、性能指標、SAST/DAST、依存関係脆弱性 scan は未計測または未実施である。これらは PASS の範囲外であり、外部公開・性能要件付きリリース前には追加検証が必要である。コード生成レビューで示された raw enum の表示ローカライズ漏れは既知の改善候補として残る。
