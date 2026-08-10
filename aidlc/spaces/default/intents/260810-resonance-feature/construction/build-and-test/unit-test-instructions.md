## 単体テスト

Vitest を使用する。`npm test -- --run src/domain/battleResonance.test.ts` で共鳴の属性効果、コスト、使用回数、減衰を確認する。

## 実行基準

各不具合は回帰テストで固定する。召喚、移動、投影、UI の関連テストも実行し、全件成功を合格とする。
