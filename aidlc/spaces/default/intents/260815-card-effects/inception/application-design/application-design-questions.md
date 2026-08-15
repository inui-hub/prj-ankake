## Q1. 効果解決の境界

カード固有効果は既存の `packages/domain` 内で、宣言的な effect registry と resolver として実装してよいですか？

- A. はい
- B. 別の構成にする
- C. Not yet defined
- X. Other (please specify)

[Answer]: A. はい

## Q2. UIとCPUの連携

UIとCPUは同じドメインの合法対象判定を利用し、個別に効果判定を持たない設計でよいですか？

- A. はい
- B. 別の構成にする
- C. Not yet defined
- X. Other (please specify)

[Answer]: A. はい

## Q3. データ保存

効果定義は既存の静的カタログとTypeScriptドメイン内に保持し、外部サービスは導入しない設計でよいですか？

- A. はい
- B. 別の構成にする
- C. Not yet defined
- X. Other (please specify)

[Answer]: A. はい

## Consolidated Summary Confirmation

- カード固有効果は `packages/domain` の effect registry と resolver に集約する。
- UIとCPUは同じ合法対象判定を利用する。
- 効果定義は静的カタログとTypeScriptドメインに保持し、外部サービスを導入しない。

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
