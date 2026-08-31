# UI修正コード生成サマリー

## 実装内容

- `AppShell` に初期値 `ja` の実行時ロケール state を追加し、メニューの `data-testid` 付き日本語／英語切替を接続した。永続化 API、`localStorage`、URL パラメータは使用していない。
- UI 表示辞書とカード表示用の境界を `apps/web/src/i18n/` に追加した。規則側はカード ID・効果 ID・`BattleValidationIssue.code` を引き続き使用し、翻訳文言を規則判定へ渡していない。
- デッキ検索の既定値を `cost:asc` に変更した。ロケールとローカライズ済み名称は transient な検索条件だけに持たせ、保存 deck model には追加していない。同コスト時の比較は `Intl.Collator` と card ID 副キーを使用する。
- 公開 `PublicBattleView` の既存 `lane`、`owner`、`playerResonance`、`canUseWaterResonance` をそのまま UI に接続した。raw `BattleState` は UI props に追加していない。
- 盤面に `data-lane`、拠点に `data-base-owner`、拠点 SVG とアクセシブルな owner 名、5×3 共鳴 table（欠損値は `0`）を追加した。水共鳴候補は盤面 square から既存 `boostCreatureMovement` command を一度だけ発行し、旧右上候補ボタンは削除した。
- runtime command の失敗 code を controller 経由で盤面近傍の `role="status"` へ渡す経路を追加した。
- `BattleCardDetailPopover` を追加し、手札・盤面カードの hover / focus / touch を排他的に所有する。popover は非操作的な `role="tooltip"` で、Escape、focus 離脱、touch の盤面外タップ、pointer 離脱で閉じ、scroll / resize 時に anchor 座標を再計算する。
- `BattleCardView` に表示専用の `effectText` を投影した。規則処理は既存の ID と command のままであり、表示テキストを規則に使用しない。
- locale を対戦準備と fatal dialog まで伝播し、日本語をアプリの初期表示にした。英語訳が未登録のカード固有文言は日本語カタログ文言を表示する。
- 水共鳴 status は取消、Escape、別カード・盤面操作、undo、成功、対戦終了・メニュー復帰で消去する。`confirmInteraction` の runtime 検証失敗も `BattleValidationIssue.code` を status に渡す。
- 修正後レビュー対応として、BattleStatus／Phase／Info／Log、対戦準備のデッキ option、popover の移動力・効果へ locale を伝播した。対戦 View は web 側の表示境界でカード名・効果だけを差し替え、規則用の ID・effect ID は変更していない。
- 水共鳴候補の通常クリック／Enter・Space は成功対象だけを実行する。player creature の盤面 context-menu は inactive／already-used を実際の validation command として status に届け、空き・非対象マスは `no-target` を status に届ける。
- touch/pen の `pointerup` で詳細を開いたカード・盤面マスは、直後の同一 `click` を一回だけ抑止する。mouse click と keyboard activation は抑止しない。
- root `lint` script を追加し、全 workspace の TypeScript 静的検証を実行する。

## 変更ファイル

- `apps/web/src/AppShell.tsx`
- `apps/web/src/i18n/localization.ts`（新規）
- `apps/web/src/i18n/cardLocalization.ts`（新規）
- `apps/web/src/battle/useBattleController.ts`
- `packages/domain/src/deck/{types,search}.ts`
- `packages/ui/src/assets/base-icon.svg`（新規）
- `packages/ui/src/components/{MenuScreen.tsx,deck/CardSearchFilterBar.tsx,deck/DeckBuildingScreen.tsx}`
- `packages/ui/src/components/{DialogOverlayHost.tsx,FatalErrorDialog.tsx,battle/BattlePreparationScreen.tsx}`
- `packages/ui/src/components/battle/{BattleScreen.tsx,BattleBoard.tsx,BattleHand.tsx,BattleCard.tsx,BattleCardDetailPopover.tsx,BattlePanels.tsx,index.ts}`
- `packages/ui/src/styles.css`
- `tests/src/domain/cardSearch.test.ts`
- `tests/src/ui/{menuScreen.test.tsx,battleScreen.test.tsx}`
- `package.json`

## テスト結果

- `npm run typecheck` — 成功
- `npm test -- --run src/ui/deckBuildingScreen.test.tsx src/ui/battleScreen.test.tsx` — 成功（2 files / 21 tests）。デッキ画面のlocale伝播、終局ダイアログ、盤面カードaccessible nameを含む。
- `npm run lint` — 成功（root lint script は全 workspace の TypeScript 静的検証を実行）。
- `npm test` — 成功（33 files / 293 tests）。

## 既知の制約

- カード翻訳は表示境界に閉じ、未登録の日本語カード表示は日本語の安全なフォールバックを使用する。カタログへ完全な表示翻訳データが供給された場合も同じ境界へ追加できる。

## 最終レビュー修正

- デッキ構築画面の全子コンポーネントへ `locale` を伝播した。見出し、操作、カード詳細、保存・検証状態、保存済みデッキ、統計、各ダイアログ、`Loading deck data` は表示辞書を通り、英語辞書が欠けた場合も日本語へフォールバックする。
- 対戦終了ダイアログは locale を受け取り、勝敗、理由、ターン、再戦、戻る、および全終局理由を日本語・英語で表示する。
- 公開盤面カードにも `currentCost` を投影し、盤面カードの accessible name にコスト、ATK、HP、操作状態（使用可能／使用不可）を含めた。既存の所有者情報は維持している。
- `deckBuildingScreen.test.tsx` と `battleScreen.test.tsx` に、デッキ子要素／loading のlocale伝播、終局ダイアログの日英表示、盤面カードaccessible nameの回帰テストを追加した。

## 最終レビュー指摘への対応

- `packages/ui/src/localization.ts` に表示専用の UI 翻訳辞書を追加し、未登録キーは日本語を安全なフォールバックにした。ゲーム規則の ID、状態、メッセージコードは変更していない。
- メニューの title、subtitle、action、description、disabled reason、catalog version を `MenuScreen` / `MenuActionButton` で locale 表示へ接続した。日本語が既定であり、英語では既存の英語 copy を表示する。
- `DialogOverlayHost` から `GlobalLoadingOverlay` へ locale を渡し、`Loading catalog` と `Opening destination` を翻訳した。
- 盤面 square とカードの accessible name、盤面上および手札の ATK / HP / cost、拠点 owner、選択・移動の状態説明、カード利用不可理由を同じ辞書へ接続した。共鳴 failure status もこの辞書を利用する。
- メニューの全主要表示と loading 状態、盤面・カードの日本語／英語 accessible name を UI 回帰テストで追加確認した。

## 最終検証

- `npm run typecheck` — 成功
- `npm test -- --run src/ui/menuScreen.test.tsx src/ui/battleScreen.test.tsx` — 成功（2 files / 21 tests）
- `npm run lint` — 成功

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-31T04:49:57Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `packages/ui/src/components/battle/BattleCard.tsx:133`, `:167-168` | 対戦カードのメタ表示と accessible name が `card.attribute` / `card.type` を直接連結している。`apps/web/src/i18n/cardLocalization.ts` が日本語化するのは name/effectText のみであり、`locale="ja"` の手札・盤面カードには `fire / creature` 等の raw enum が残る。FR-1 のプレイヤー向け日英表示境界に漏れがある。 | `localizeCardType` / `localizeCardAttribute`（または同等の presentation mapper）をメタ表示、accessible name、カード画像 fallback の type/attribute に適用し、手札・盤面の日本語回帰テストを追加する。 |
| 2 | Major | `packages/ui/src/components/CardArtwork.tsx:48-49`, `packages/ui/src/components/battle/BattleCard.tsx:25-33` | 画像がない対戦カードでは `BattleCard` が raw enum を `CardArtwork` に渡すため、fallback の可視 type/attribute も日本語で `creature` / `fire` のままになる。accessible name の末尾だけは日本語化されているため、同じ fallback 内で表示言語が混在する。 | fallback に渡す表示用 type/attribute を locale mapper で解決し、ja/en それぞれで visible fallback と accessible name の両方を検証する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm run typecheck` | PASS（全 workspace） | 型整合性を確認。raw enum の表示漏れは検出しない。 |
| `npm run lint` | PASS | 静的検証は成功。locale 表示契約は別途確認が必要。 |
| `npm test -- --run` | PASS（33 files / 296 tests） | 全テストが完了し、従来の動的正規表現 SyntaxError は再発しない。 |
| `tests/src/ui/cardArtwork.test.tsx` | PASS（ja/en accessible name） | fallback accessible 名の指定修正を確認。ただし対戦 fallback の可視 enum は未検証。 |

### Summary

指定された fallback accessible 名と動的正規表現の安定化は確認でき、typecheck/lint/全296テストも成功した。一方、対戦カードのメタ情報と画像 fallback に raw enum が残るため改善余地はあるが、Critical なし・Major 2件の判定規則に基づき READY とする。
