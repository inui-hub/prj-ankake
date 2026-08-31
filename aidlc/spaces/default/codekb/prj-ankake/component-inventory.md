## コンポーネント一覧

| コンポーネント | 責務 | 状態 | UI修正への影響 |
| --- | --- | --- | --- |
| Web application shell | 起動、経路、controller 合成 | at-risk | 全画面ロケール状態の所有候補 |
| Static catalog/startup | JSON 取得、manifest 適用、検証 | at-risk | 表示文言と実行規則の分離が必要 |
| Domain state/deck | メニュー、検索・ソート、デッキ操作 | healthy | 初期ソートを `cost`/昇順へ変更 |
| Battle domain | 盤面、拠点、共鳴、命令検証、投影 | at-risk | 共鳴・カード詳細の公開投影を拡張 |
| UI library | menu/deck/battle React 部品と CSS | at-risk | 翻訳、レーン、拠点、popover、水共鳴操作 |
| Deck persistence | IndexedDB repository | healthy | 直接影響なし |
| CPU strategy | 可視状態からの行動選択 | healthy | 公開 UI の変更とは分離 |
| Test suite | domain/app/ui 境界の Vitest | at-risk | ロケール・アクセシビリティ・投影の回帰追加が必要 |

### ソース証跡

`apps/web/src/`, `packages/{domain,ui,persistence,cpu}/src/`, `tests/src/`。
