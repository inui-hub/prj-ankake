## 依存関係

`@ankake/web` は `@ankake/ui`、`@ankake/domain`、`@ankake/persistence`、`@ankake/cpu` に依存する。`ui`、`persistence`、`cpu` は `domain` に依存し、domain は workspace 外の実行依存を持たない。この一方向性がゲーム規則を UI と保存方式から隔離する。

外部依存は React/React DOM、開発依存は TypeScript、Vite、Vitest、Testing Library、fast-check、jsdom と型定義である。サードパーティサービス SDK は検出されない。

### ソース証跡

root および各 workspace の `package.json`、`package-lock.json`。
