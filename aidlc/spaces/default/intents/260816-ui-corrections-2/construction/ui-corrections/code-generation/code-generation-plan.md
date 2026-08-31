# UI修正コード生成計画

## 実装方針

既存の依存方向 `apps/web → packages/ui → packages/domain` を維持する。画面は raw `BattleState` を受け取らず、対戦表示は引き続き `PublicBattleView` と `BattleCardView` のみを入力にする。ロケールは `AppShell` が実行中だけ保持し、表示用辞書・カード表示用のローカライズ変換は web/UI 層に閉じ込める。規則処理は表示テキストではなく既存のカード ID、効果 ID、`BattleValidationIssue.code` を用いる。

## Step 1: 表示ロケールと翻訳境界を追加する

- **変更対象ファイル**
  - `apps/web/src/AppShell.tsx`
  - `apps/web/src/i18n/localization.ts`（新規）
  - `apps/web/src/i18n/cardLocalization.ts`（新規）
  - `packages/ui/src/components/MenuScreen.tsx`
  - `packages/ui/src/components/DialogOverlayHost.tsx`
  - `packages/ui/src/components/FatalErrorDialog.tsx`
  - `packages/ui/src/components/deck/*.tsx`
  - `packages/ui/src/components/battle/{BattlePreparationScreen,BattleScreen,BattlePanels,BattleInteractionControls,BattleDialogs,BattleHand,BattleCard}.tsx`
- **対応要件**: FR-1
- **変更内容**
  - `AppShell` に初期値 `ja` の React state を置き、メニュー右上の言語切替で `ja`/`en` を切り替える。永続化 API、localStorage、URL パラメータは追加しない。
  - ロケールと `t(key, fallback)`、カード ID ごとの名称・効果・属性等の表示値を、すべてのプレイヤー向け UI props に明示的に渡す。訳文がない場合は必ず日本語へ戻す。
  - メニュー、デッキ構築、対戦準備、対戦盤面、カード詳細、既存の `DialogOverlayHost`／`FatalErrorDialog` のプレイヤー向け文言を辞書キーへ移す。開発用の `recordLocalDiagnostic` によるコンソール出力は翻訳対象にしない。
  - `BattleCardView` の規則用 ID と表示用のカード文言を混同せず、効果実行・カード効果の分岐は既存の `catalogCardId`／`effectIds` を維持する。
- **最小テスト**
  - `tests/src/ui/menuScreen.test.tsx`: 初期日本語、切替後の英語、再マウント時に日本語へ戻ること。
  - `tests/src/ui/deckBuildingScreen.test.tsx` と `tests/src/ui/battleScreen.test.tsx`: 代表的なラベル・カード効果が切替に追随し、欠損英訳が日本語にフォールバックすること。
  - fatal dialog を描画する UI テスト: 既存の起動エラーのタイトル、本文、再読込操作を選択言語で表示すること。

## Step 2: デッキ一覧の既定ソートとロケール依存の副キーを修正する

- **変更対象ファイル**
  - `packages/domain/src/deck/search.ts`
  - `packages/domain/src/deck/types.ts`（必要なら比較ロケールを検索入力へ追加）
  - `packages/domain/src/deck/{session,projection}.ts`
  - `apps/web/src/deck/{deckWorkflowService,useDeckBuildingController}.ts`
  - `packages/ui/src/components/deck/CardSearchFilterBar.tsx`
  - Step 1 のローカライズ変換
- **対応要件**: FR-1, FR-2
- **変更内容**
  - `DEFAULT_CARD_SEARCH_CRITERIA` を `cost:asc` に変え、初期表示、リセット、デッキ構築画面への再入場に同じ定数を適用する。保存モデルには追加しない。
  - 同コスト時は選択ロケールでローカライズ済み名称を `Intl.Collator` で昇順比較し、同名時はカード ID 昇順にする。既存の英語固定 `localeCompare` を残さない。
  - ソート選択肢を翻訳し、`cost:asc` は日本語で「コスト昇順」、英語で `Cost up` と表示する。ソート値自体は既存の安定した enum を使う。
- **最小テスト**
  - `tests/src/domain/cardSearch.test.ts`: 初期・リセットが `cost:asc`、同コストの日本語/英語名称比較、同名の ID 副キーを検証する。
  - `tests/src/app/deckWorkflowService.test.ts`: メニュー復帰後の再入場でソートが既定値へ戻り、保存状態に混入しないこと。
  - `tests/src/ui/deckBuildingScreen.test.tsx`: ロケールごとのソート表示名とリセット操作を検証する。

## Step 3: 公開対戦投影を表示に必要な最小情報だけ拡張する

- **変更対象ファイル**
  - `packages/domain/src/battle/projection.ts`
  - `packages/domain/src/battle/types.ts`（投影に必要な安定した型のみ）
  - `packages/domain/src/battle/validation.ts`
  - `packages/domain/src/battle/{engine,automaticPhases,resonance}.ts`（既存の水共鳴使用済み・ターン開始リセットを確認し、契約に不足がある場合のみ最小修正）
  - `packages/domain/src/battle/index.ts` と `packages/domain/src/index.ts`（公開 export が必要な場合のみ）
- **対応要件**: FR-3, FR-5, FR-6、NFR
- **変更内容**
  - `BattleBoardSquareView.lane` と `BattleBaseView.owner` を UI の `data-lane`／`data-base-owner` とアクセシブル名に使う。UI は `BattleState` や `resonanceUsage` を受け取らない。
  - 共鳴表の値は既存 `PublicBattleView.playerResonance` を唯一の値源とし、各 lane/attribute の `undefined` を表示時に `0` とする。CPU値や非公開値は追加しない。
  - 水共鳴の可否は引き続き `boardSquares[].occupant.canUseWaterResonance` とし、`validateBattleCommand` の結果は `BattleValidationIssue.code` を UI へ渡せる安定した失敗情報にする。`message` の英語本文をローカライズキーにしない。
  - 成功時の temporary movement `+1`、対象 lane の `water` 使用済み、プレイヤー次ターン開始時の lane ごとのリセットは、既存実装を回帰テストで固定する。変更が不要なら規則コードは触らない。
- **最小テスト**
  - `tests/src/domain/battleProjection.test.ts`: public view に 3 lane × 5 attributes の player resonance と水共鳴可能カードだけが投影されること、欠損に対する UI 用 `0` フォールバック契約を確認する。
  - `tests/src/domain/battleResonance.test.ts`: 有効条件、成功時の `+1` と使用済み、次の player standby でのリセット、無効 command が状態を変えないこと。
  - `tests/src/domain/battleProjection.test.ts` または `battleValidation` の追加テスト: 各失敗コードが UI のローカライズ契約へ渡ること。

## Step 4: 盤面のレーン・拠点と共鳴表を描画する

- **変更対象ファイル**
  - `packages/ui/src/components/battle/{BattleBoard,BattlePanels}.tsx`
  - `packages/ui/src/styles.css`
  - `packages/ui/src/assets/base-icon.svg`（新規。小サイズの単色拠点アイコン）
  - `tests/src/ui/battleScreen.test.tsx`
- **対応要件**: FR-1, FR-3, FR-5
- **変更内容**
  - 通常・空きレーンに `data-lane="left|center|right"` と `#EAF3FF`/`#FFF8E1`/`#FCECEC` を適用し、名称・数値・アイコンは `#111827` にする。選択と水共鳴強調は背景を上書きせず `#111827` の 3px outline に統一する。
  - 拠点は名称を盤面本文から除き、SVG アイコンと HP を表示する。`data-base-owner="none|player|cpu"`、塗り `#6B7280`/`#2563EB`/`#DC2626`、アイコン・HP の `#FFFFFF` を適用する。owner の意味を持つアイコンにはローカライズ済み accessible name を与え、SVG 読込失敗時もテキスト代替を残す。
  - 見出し付きの semantic table として属性行 `fire, water, wind, light, dark`、レーン列 `left, center, right` を順に描画し、`playerResonance` 更新で再描画する。
- **最小テスト**
  - `tests/src/ui/battleScreen.test.tsx`: 3 lane の data 属性、拠点所有 data 属性・HP・accessible name、選択/水共鳴強調の class を確認する。
  - 同テストに、5×3 table の行列順、`0` フォールバック、更新した `PublicBattleView` の再描画を追加する。
  - UI テストで指定の前景/背景色を `getComputedStyle` から取得し、テスト helper で WCAG 2.1 相対輝度比が 4.5:1 以上であることを通常・選択・強調・各拠点 owner について検証する。

## Step 5: 非操作的なカード詳細 popover を追加する

- **変更対象ファイル**
  - `packages/ui/src/components/battle/{BattleScreen,BattleBoard,BattleHand,BattleCard,BattleCardDetailPopover}.tsx`（popover は新規）
  - `packages/ui/src/styles.css`
  - `tests/src/ui/battleScreen.test.tsx`
- **対応要件**: FR-1, FR-4
- **変更内容**
  - 詳細の owner state は `BattleScreen` に置き、`instanceId` と入力種別（pointer/focus/touch）を一件だけ持つ。手札は既存 button、盤面は既存 square button を focus target とするため、盤面カードの `div` を button 化せず、対話要素をネストしない。
  - hover/focus/tap で同時に一件だけを開き、pointer はカード（盤面の場合は square）または popover にポインタがある間維持する。focus は対象 button の blur で閉じる。touch は同一再タップ、別カード、盤面外タップ、Escape で閉じる。
  - popover は `role` を持たない非操作的要素とし、イラスト、名称、攻撃、HP、移動力、効果を表示する。アンカーの `getBoundingClientRect()` と viewport を用いて下優先、上、左右クランプの順で配置し、scroll/resize で再計算する。
  - Enter/Space は既存の card/square command handler を優先して一回だけ実行し、詳細表示によってクリック・roving focus・盤面選択を阻害しない。
- **最小テスト**
  - `tests/src/ui/battleScreen.test.tsx`: 手札と盤面の hover/focus/touch の一件排他、各閉鎖条件、Escape、カード情報、既存 Enter/Space/クリック callback の維持を検証する。
  - jsdom で矩形を stub し、下/上/左右クランプと scroll 後の位置再計算を検証する。

## Step 6: 水共鳴の盤面直接選択と失敗フィードバックを接続する

- **変更対象ファイル**
  - `apps/web/src/{AppShell.tsx,battle/useBattleController.ts,battle/battleRuntimeService.ts}`
  - `packages/ui/src/components/battle/{BattleScreen,BattleBoard,BattlePanels}.tsx`
  - `packages/ui/src/styles.css`
  - Step 1 の `apps/web/src/i18n/localization.ts`
  - `tests/src/app/{battleRuntimeService,battleInteraction}.test.ts`
  - `tests/src/ui/battleScreen.test.tsx`
- **対応要件**: FR-1, FR-3, FR-6
- **変更内容**
  - 右上の creature 名ボタン一覧を削除し、`canUseWaterResonance === true` の盤面カード/square だけに水共鳴強調を出す。クリックまたは focus 後 Enter/Space は `{ type: "boostCreatureMovement", side: "player", creatureInstanceId }` を一度だけ発行する。
  - command 結果を controller で受け、成功時は選択強調と失敗表示を消す。失敗、取消、別操作時は command を追加発行せず強調を解除し、session state を更新しない。
  - `BattleValidationIssue.code` による UI メッセージ表を作る。`battle.resonance.inactive`、`battle.resonance.already-used`、対象なしの UI 状態を日本語・英語で定義し、その他は同じ code の翻訳があれば使用し、なければ日本語の安全な一般エラーへフォールバックする。表示場所は盤面近傍の `role="status"` とし、次の盤面操作、取消、成功、Escape で解除する。
- **最小テスト**
  - `tests/src/ui/battleScreen.test.tsx`: 有効カードのみの強調、click と keyboard の command payload、右上の旧ボタンが無いこと、成功/失敗/取消での強調・status 表示を確認する。
  - `tests/src/app/battleRuntimeService.test.ts`: 失敗 command が session state を変えず、失敗 code を UI 層へ渡せることを確認する。
  - `tests/src/ui/battleScreen.test.tsx`: 各既定失敗文言の日英と未知 code の日本語フォールバックを確認する。

## 未解決レビュー指摘に対する安全な実装判断

要件レビューは `NOT-READY` だが、実装を推測で拡張しないため、以下をこの unit の固定境界とする。

| 指摘 | 安全な判断 |
| --- | --- |
| FR-1 の対象範囲 | 既存のプレイヤー画面（メニュー、デッキ構築、対戦準備、対戦盤面、カード詳細）に加え、既存 `DialogOverlayHost` の loading/fatal startup dialog を翻訳する。管理 UI は存在せず、コンソール診断は開発用として対象外にする。新画面は作らない。 |
| FR-6 の失敗文言・伝達 | 規則層は `BattleValidationIssue.code` を正とし、UI のロケール辞書が code を文言へ解決する。`message` の英語本文を利用しない。対象なしは UI が候補なしを検出した場合のみ表示し、inactive/already-used/その他は command 検証結果から表示する。 |
| FR-5 の値の主体 | 既存 public projection の `playerResonance` を表示する。CPU の非公開状態は追加しない。ヘッダは選択言語、構造は table、欠損は `0` とする。 |
| FR-4 の盤面 focus | 既存の盤面 square button を唯一の盤面フォーカス対象にし、DOM 内の `BattleCard` は非対話 `div` のままにする。roving tabindex と矢印キーは維持し、Enter/Space は既存 square 操作だけを発火する。 |
| FR-3 の拠点アイコン | UI パッケージ所有の小さな SVG を追加し、`none`/`player`/`cpu` の owner を示すローカライズ済み accessible name と text fallback を提供する。icon の画像欠損時にも HP と owner 名で識別できる。 |

## 完了条件

- 実装はこの計画の対象に限定し、既存の未コミット変更を巻き戻さない。
- `npm test`、`npm run lint`、`npm run typecheck` のプロジェクト既存コマンドを実行し、追加した最小テストを含めて成功させる（実際の script 名は `package.json` に従う）。
- UI は `data-testid` と安定した `data-lane`／`data-base-owner` を保ち、自動テストでロケール、ソート、popover、水共鳴、アクセシビリティを検証できる状態にする。
