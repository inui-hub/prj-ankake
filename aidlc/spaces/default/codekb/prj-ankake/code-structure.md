## コード構造

- `apps/web/`: Vite 起動点、`AppShell`、startup、deck/battle controller、アプリ CSS、静的 JSON。
- `packages/domain/`: catalog、app-state、deck、menu、battle、diagnostics。規則、型、検証、公開投影を所有する。
- `packages/ui/`: menu/deck/battle の React 部品、共有 CSS、表示用コールバック契約。
- `packages/persistence/`: IndexedDB のデッキ repository と serializer。
- `packages/cpu/`: domain の可視状態を読む CPU 戦略。
- `tests/`: domain、app、ui、cpu、persistence、generator の Vitest テスト。

依存方向は `web → ui/domain/persistence/cpu`、`ui/persistence/cpu → domain`。domain は他 workspace に依存しない。翻訳辞書は UI/アプリケーション層に置き、domain の命令・規則 ID を表示文言へ逆流させない。

### ソース証跡

root `package.json`, `packages/domain/src/index.ts`, `apps/web/src/`, `packages/*/src/`。
