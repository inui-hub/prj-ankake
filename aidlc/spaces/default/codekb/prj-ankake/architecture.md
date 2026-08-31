## Architecture Analysis

### System Overview

`project-ankake` は npm workspaces 上のブラウザ専用モジュラーモノリスである。`@ankake/web` が React/Vite の合成層、`@ankake/domain` がゲーム規則と表示投影、`@ankake/ui` が React 表示、`@ankake/persistence` が IndexedDB、`@ankake/cpu` が CPU 戦略を担う。サーバー API、認証、外部サービスは検出されない。

```mermaid
flowchart LR
  Player[プレイヤー] --> Web[@ankake/web]
  Web --> UI[@ankake/ui]
  Web --> Domain[@ankake/domain]
  Web --> Persistence[@ankake/persistence]
  Web --> CPU[@ankake/cpu]
  Web --> Assets[public/data JSON]
  Persistence --> IndexedDB[(IndexedDB)]
```

テキスト代替: Web 合成層が UI、純粋な規則層、ブラウザ保存、CPU、静的カタログを接続する。

### UI修正に関する設計判断

**ADR-RE-001 — ローカライズは表示契約として分離する。** 現状は `runStartup` が canonical manifest から日本語 `effectText` を組み立て、`effectPrograms.ts` がその文言を照合している。英日切替を安全に実装するには、実行規則を `effectId`/構造化定義で識別し、表示文言と UI ラベルは選択ロケールから解決する。文言を規則キーにしたまま翻訳だけを追加しない。

**ADR-RE-002 — 公開対戦投影を表示の唯一の境界にする。** `PublicBattleView` はプレイヤー PP・共鳴・手札を中心に公開する。共鳴表、CPU 側の必要情報、カード詳細は raw `BattleState` を UI に渡さず、この投影と `BattleCardView` を拡張して供給する。

**ADR-RE-003 — 盤面操作と詳細閲覧を分離する。** `BattleBoard` のマスは既に `button` である。詳細表示は同一ボタンをさらにネストせず、hover/focus に連動する非操作的 popover/tooltip とし、キーボードのフォーカス移動・盤面選択を保持する。

### ソース証跡

`apps/web/src/AppShell.tsx`, `apps/web/src/startup/startupOrchestrator.ts`, `packages/domain/src/battle/{projection,resonance,effectPrograms}.ts`, `packages/ui/src/components/battle/BattleBoard.tsx`。
