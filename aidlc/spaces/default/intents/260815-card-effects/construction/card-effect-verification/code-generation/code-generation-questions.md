**Collaborator:** aidlc-developer-agent

# Code Generation Questions — card-effect-verification

## Plan Approval

対象選択 UI は、既存の効果解決器を変更せず、公開された合法候補を共通の段階的選択フローで収集して `effectSelection` として送信します。単一／複数のユニット・拠点・レーン・マス・墓地を扱い、選択不要の効果は即時実行のままとします。

- [ ] Approve Plan — proceed to code generation
- [ ] Request Changes — revise the plan

[Answer]: Approve Plan

## Consolidated Summary Confirmation

- 効果解決と command の再検証は domain を唯一の判定源として維持する。
- 戦闘画面に、単一・複数のユニット／拠点／レーン／マス／墓地の共通選択フローを追加する。
- 選択不要カードは即時実行し、取消、不足、不正候補、途中失効を安全に扱う。
- UI の操作テストと workspace 全体の型検査・テストで確認する。

- Looks correct
- Request changes

[Answer]: Looks correct
