# セキュリティテスト手順

## 適用判断

`code-generation-plan.md` と `code-summary.md` により、今回の範囲は UI ローカライズ、公開済み対戦投影、既存 command の表示接続である。認証、認可、外部入力 API、秘密情報、永続化、ネットワーク境界は追加・変更していない。最小テスト戦略では専用 security scan は必須ではない。

## 実施する回帰確認

```bash
npm run typecheck
npm run lint
npm test -- --run
```

この結果で、型境界と既存 command 経路の回帰を確認する。特に raw `BattleState` を UI props に渡さず `PublicBattleView` / `BattleCardView` を境界とすること、表示訳文で effect ID・カード ID・`BattleValidationIssue.code` の規則判定を行わないことを対象とする。

## 未実施項目とリリース条件

SAST、依存関係の CVE scan、DAST、侵入試験は今回未実施である。これらは「問題なし」の根拠ではない。CI またはリリース工程で依存関係 scan が要求される場合は、lockfile を対象に high/critical を確認し、外部公開時には認証・認可・XSS を実行環境で別途試験する。ソース上の credential/API key を追加しないという construction guardrail は継続適用する。
