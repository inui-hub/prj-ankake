# 要件確認

### Q1. 言語切替は全画面とカード効果に適用しますか？
A. はい
B. カード効果のみ
X. Other (please specify)

[Answer]: はい

## Consolidated Summary Confirmation

- 言語切替はメニュー、デッキ構築、対戦準備、対戦盤面、カード詳細のプレイヤー向け文言とカード効果に適用し、日本語を初期値・未翻訳時のフォールバックにする。選択は保存しない。
- デッキ一覧は `cost:asc` を初期値・リセット値とし、再訪時にも戻す。同コストは選択言語名、カード ID の順で安定して並べる。
- レーンと拠点は指定色、アイコン、状態属性、4.5:1 以上のコントラストで識別する。
- 手札と盤面のカードは hover／focus／タップで、既存操作を遮らない詳細を表示する。
- 共鳴値は公開 ViewModel から 5×3 表へ反映し、水共鳴は盤面の有効対象を直接選んで処理する。無効操作では状態を変えず理由を示す。
- 翻訳範囲をゲーム内の全プレイヤー向け表示へ明確化し、カード詳細の入力別状態遷移・配置規則、色の前景と測定条件、水共鳴の既存コマンド・対象条件・失敗理由を明記する。

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
