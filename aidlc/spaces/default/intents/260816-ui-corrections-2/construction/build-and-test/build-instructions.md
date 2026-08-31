# ビルド手順

## 参照と前提

本手順は上流の `code-generation-plan.md` および `code-summary.md` を対象とする。React/Vite の web アプリ、UI パッケージ、domain パッケージ、Vitest テストワークスペースを npm workspaces として検証する。

- Node.js と npm を利用可能にする。
- リポジトリ直下で依存関係をインストール済みにする（初回は `npm install`）。
- 本変更は外部サービス、環境変数、ローカル DB を必要としない。ロケールは実行時 state のみで、`localStorage` や URL 設定は不要である。

## 実行コマンド

リポジトリ直下で次を実行する。

```bash
npm run typecheck
npm run lint
npm test -- --run
```

`typecheck` は全 workspace の TypeScript 静的検証、`lint` は現在 root script で同じ静的検証を実行する。`test -- --run` は Vitest を watch せず一回実行する。プロダクション bundle の明示的な検証が必要なリリース前には、追加で `npm run build` を実行する。

## 合格基準と対処

- 上記3コマンドが終了コード 0 で完了すること。
- FR-1〜FR-6 の回帰テストが成功し、raw `BattleState` を UI へ公開しない NFR 境界を維持すること。
- 失敗時は最初の失敗テストと TypeScript エラーを特定し、依存関係の再インストール、Node/npm バージョン、workspace の実行位置を確認する。生成物や lockfile を根拠なく削除・変更しない。

## 実績

`npm run typecheck`、`npm run lint`、`npm test -- --run` は実装完了時に成功済みである。今回の成果物作成ではコード・設定・テストを変更せず、コマンドを再実行していない。詳細は `build-test-results.md` を参照する。
