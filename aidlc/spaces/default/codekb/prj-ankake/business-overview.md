## 事業・ゲーム概要

`project-ankake` は、デッキ構築と CPU 対戦を提供するブラウザ型ターン制カードゲームである。メニューからデッキ構築または対戦準備へ遷移し、静的カードカタログ、ローカル保存、盤面・拠点・共鳴ルールを組み合わせる。

`ui_points.md` が示す今回の対象は、全画面の英日切替、デッキの既定 `Cost up`、レーン識別、拠点アイコンと制圧表示、手札/盤面カード詳細、5×3 共鳴表、盤面から直接選ぶ水共鳴である。

### ソース証跡

`ui_points.md`, `apps/web/src/AppShell.tsx`, `packages/domain/src/menu/projector.ts`, `docs/project_ankake_screen_detailed_requirements_SCR-00{1,2,4}_*.md`。
