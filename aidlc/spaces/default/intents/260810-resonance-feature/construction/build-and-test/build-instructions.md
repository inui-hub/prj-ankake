## ビルド手順

上流の `code-generation-plan` と `code-summary` に基づき、Node.js と npm を準備してリポジトリ直下で `npm run build` を実行する。Web パッケージの Vite 本番ビルドが完了すれば成功である。

## 確認

`npm run typecheck` と `npm test` を続けて実行する。依存サービス・環境変数は不要である。
