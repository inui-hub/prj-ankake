## Sources

- [desc] Initial description: "`docs/`の仕様書の要件のうち未実装の機能を洗い出してください"
- [scope] Workflow-selected scope: `feature`.

## Q1. 解決したい問題と、未実装と判定する基準は何ですか？

- A. docs/ の仕様記載と実装を照合し、対応する実装がない項目を未実装とする
- B. 動作確認も行い、仕様どおりに動かない項目も未実装相当として扱う
- C. 設計・テスト・ドキュメントの欠落も含めて差分を扱う
- D. Not yet defined
- E. 別の基準を指定する
- X. Other (please specify)

[Answer]: A. docs/ の仕様記載と実装を照合し、対応する実装がない項目を未実装とする

## Q2. この監査結果を主に利用するのは誰で、その人の困りごとは何ですか？

- A. 開発チーム — 実装すべき機能の漏れを把握したい
- B. プロダクト／企画担当 — 仕様の実現状況を判断したい
- C. 品質保証担当 — テスト・リリース判断の根拠がほしい
- D. 複数の関係者
- E. Not identified
- X. Other (please specify)

[Answer]: A. 開発チーム — 実装すべき機能の漏れを把握したい

## Q3. 成功とみなす成果物・測定可能な完了条件は何ですか？

- A. 未実装項目を仕様書ごとに一覧化できること
- B. 各項目に実装状況と根拠（該当コードまたは不在の確認）を付けること
- C. 優先度または影響度も付けて次の対応を決められること
- D. A〜C のすべて
- E. Not yet defined
- X. Other (please specify)

[Answer]: B. 各項目に実装状況と根拠（該当コードまたは不在の確認）を付けること

## Q4. この取り組みを今行うきっかけは何ですか？

- A. リリース／受け入れ前の確認
- B. 実装計画やバックログを整備するため
- C. 仕様と実装の乖離が疑われるため
- D. Opportunity（現状把握・改善機会の把握）
- E. Not applicable
- X. Other (please specify)

[Answer]: B. 実装計画やバックログを整備するため

## Q5. 対象にする docs/ 配下の仕様書と、照合する実装範囲をどう指定しますか？

- A. docs/ 配下のすべての仕様書とリポジトリ全体
- B. 指定するサブディレクトリ／ファイルだけ
- C. 特定の機能領域に関係する仕様書と実装だけ
- D. Not yet defined
- E. まず候補を調査してから決める
- X. Other (please specify)

[Answer]: A. docs/ 配下のすべての仕様書とリポジトリ全体

## Q6. 対象範囲や優先順位を最終決定するのは誰で、誰が意見を出しますか？

- A. 依頼者が決定し、開発チームが助言する
- B. プロダクト担当が決定し、開発・品質担当が助言する
- C. チーム合意で決定する
- D. Not identified
- E. Not applicable
- X. Other (please specify)

[Answer]: A. 依頼者が決定し、開発チームが助言する

## Q7. 進捗・結果の共有方法や報告頻度に希望はありますか？

- A. 最終レポートのみ
- B. 調査中の重要な発見を都度共有
- C. 日次または定期的に共有
- D. None
- E. Not yet defined
- X. Other (please specify)

[Answer]:

## Q8. workflow-selected の `feature` は、意図する作業範囲に合っていますか？

- A. はい。仕様と実装の差分監査を 1 つの機能作業として進める
- B. いいえ。より小さい調査・検証の範囲にしたい
- C. いいえ。より広い計画・実装まで含めたい
- D. Not yet defined
- E. まず調査結果を見てから決める
- X. Other (please specify)

[Answer]:
