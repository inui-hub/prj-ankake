# 性能テスト手順

## 適用判断

`code-generation-plan.md` と `code-summary.md` を確認した結果、今回の変更はクライアント表示、ローカル state、既存公開投影の接続であり、性能 SLO、同時利用者数、API throughput、auto-scaling の NFR は定義されていない。最小テスト戦略でもあり、負荷試験は必須品質ゲートではない。

## 将来の確認方法

popover の scroll/resize 再配置、locale 切替、共鳴表更新に性能回帰の懸念が生じた場合は、production 相当ブラウザで以下を測定する。

- `PublicBattleView` 更新を連続投入した際の描画時間と long task。
- locale 切替、hover/focus/touch による popover 開閉の入力遅延。
- scroll/resize 中の popover 再計算で frame budget を継続的に超えないこと。

開発者ツールの Performance 記録または導入済みベンチマークを使い、対象デバイス・データ件数・p50/p95・測定回数を記録する。しきい値はプロダクト NFR が承認されてから設定する。

## 結果と制約

今回、負荷・ストレス・soak・auto-scaling 試験は未実施である。`npm run typecheck`、`npm run lint`、`npm test -- --run` の成功は機能・静的検証の根拠であり、性能保証ではない。性能 SLO を伴うリリースでは別途 NFR と production 相当環境を準備して検証する。
