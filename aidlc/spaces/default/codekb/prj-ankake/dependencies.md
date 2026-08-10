## ワークスペース依存関係

```text
@ankake/web -> @ankake/domain, @ankake/cpu, @ankake/persistence, @ankake/ui
@ankake/cpu -> @ankake/domain
@ankake/persistence -> @ankake/domain
@ankake/ui -> @ankake/domain, react
@ankake/tests -> 全 package
```

## 外部依存関係

- 実行時: `react`, `react-dom`
- 開発時: TypeScript, Vite, Vitest, fast-check, Testing Library, jsdom, React 型定義

## 共鳴の内部依存と変更方向

`battle/resonance.ts` は `catalog/types` の属性列挙と `battle/constants` の上限に依存する。現在の caller は `stateFactory.ts` と `engine.ts` だけで、`automaticPhases.ts`、attack/destruction、spell resolution、projection、UI、CPU は未接続である。

新しい依存は domain 内に閉じる。`GameEngine`・automatic phases・attack/effects は resonance policy を呼び、projection が表示 DTO を生成し、web/UI/CPU はその公開契約または command API にだけ依存する。persistence と静的カタログは、カードの元コスト・属性を読む既存の関係以外に対戦中共鳴状態を所有しない。
