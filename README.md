# Project Ankake

盤面上でクリーチャーを進軍させ、拠点の制圧を目指す1人用（対CPU）デジタルカードゲームのプロトタイプです。

- [ゲームをブラウザでプレイする](https://inui-hub.github.io/prj-ankake/)
- [プレイヤーガイド（ルールと遊び方）](./docs/player-guide.md)
- [詳細な基本ルール仕様](./docs/project_ankake_basic_rules_requirements_spec_v1_1.md)

## ローカルで起動する

### 必要なもの

- Node.js 20 以降
- npm（Node.js に同梱）

### 手順

リポジトリのルートで次を実行します。

```bash
npm ci
npm run dev
```

起動メッセージに表示されるURL（通常は <http://127.0.0.1:5173/>）をブラウザで開くとゲームを開始できます。終了するにはターミナルで `Ctrl+C` を押します。

本番ビルドの確認には、次を使用します。

```bash
npm run build
npm run preview
```

## GitHub Pages でプレイする

`main` ブランチへのpushにより、GitHub Actions の **Deploy GitHub Pages** ワークフローがアプリをビルドして公開します。デプロイの完了後、次のURLからプレイできます。

<https://inui-hub.github.io/prj-ankake/>

初回のみ、リポジトリの **Settings > Pages** で公開元として **GitHub Actions** を有効にしてください。ワークフローの実行結果は [Actions](https://github.com/inui-hub/prj-ankake/actions) で確認できます。

## 遊び方

ゲームを始めるには、メニューから **デッキ構築** で40枚のデッキを保存し、**CPU対戦** でプレイヤー用・CPU用のデッキと先攻設定を選んでください。詳しい操作とルールは [プレイヤーガイド](./docs/player-guide.md) を参照してください。

## 開発用コマンド

```bash
npm run typecheck
npm test
```
