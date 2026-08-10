## 言語・実行基盤

- TypeScript 5.5、ES modules、npm workspaces
- ブラウザ実行の React 18.3 / React DOM 18.3
- Vite 5.4 と `@vitejs/plugin-react` 4.3

## 品質・テスト基盤

- Vitest 2.0、fast-check 3.23（domain の性質テスト）
- Testing Library React 16.0、jsdom 24.1（UI テスト）
- TypeScript compiler による package ごとの型検査

## データ・配布

- 静的 JSON カタログを Vite public asset として配布
- ブラウザ IndexedDB にデッキを保存
- `apps/web/dist/` は生成済み Vite 配布物

## 共鳴への技術的含意

共鳴はブラウザ通信や新しい実行基盤を必要としない。既存の TypeScript domain 型、Vitest、fast-check、React 表示層の範囲で完結する。ただし domain package が公開する `PublicBattleView` と command union は web、UI、CPU、tests の契約変更となる。
