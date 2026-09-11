import type { CardMasterRecord } from "@ankake/domain";

/** Presentation-only copy. Domain IDs and state remain locale independent. */
export type UiLocale = "ja" | "en";

const JAPANESE: Readonly<Record<string, string>> = {
  "menu.subtitle": "オリジナルデジタルカードゲーム・プロトタイプ",
  "menu.cpu-battle": "CPU対戦",
  "menu.deck-building": "デッキ構築",
  "menu.cpu-battle.description": "対戦ルールの実装後にローカル CPU 対戦をプレイできます。",
  "menu.deck-building.description": "デッキ保存機能の実装後にローカルデッキを調整できます。",
  "menu.available-later": "今後の作業単位で利用可能になります。",
  "menu.catalog-loading": "カタログを読み込み中",
  "loading.catalog": "カタログを読み込み中",
  "loading.destination": "画面を開いています",
  "battle.board": "盤面",
  "battle.column": "列",
  "battle.row": "行",
  "battle.normal-square": "通常マス",
  "battle.cpu-base": "敵拠点",
  "battle.player-base": "味方拠点",
  "battle.neutral-base": "中立拠点",
  "battle.health": "HP",
  "battle.attack": "ATK",
  "battle.cost": "コスト",
  "battle.selected-summon": "選択中の召喚先",
  "battle.available-destination": "選択可能な配置先",
  "battle.movement-origin": "移動元",
  "battle.movement-path": "移動経路",
  "battle.provisional-position": "仮のクリーチャー位置",
  "battle.occupied-by": "配置カード",
  "battle.controlled-by": "操作プレイヤー",
  "battle.player-controlled": "プレイヤー",
  "battle.cpu-controlled": "CPU",
  "battle.unclaimed": "中立",
  "battle.unknown": "不明",
  "battle.card-unavailable": "カード情報を取得できません。",
  "battle.resonance.inactive": "このレーンの水共鳴は有効ではありません",
  "battle.resonance.already-used": "このレーンの水共鳴はこのターンに使用済みです",
  "battle.resonance.no-target": "このレーンには水共鳴の対象がありません",
  "battle.resonance.unknown": "操作を実行できませんでした"
  , "battle.status": "状態"
  , "battle.status.available": "使用可能"
  , "battle.status.unavailable": "使用不可"
  , "battle.result.victory": "勝利"
  , "battle.result.defeat": "敗北"
  , "battle.result.reason": "理由"
  , "battle.result.turn": "ターン"
  , "battle.result.rematch": "再戦"
  , "battle.result.return": "戻る"
  , "battle.result.base-destroyed": "敵拠点を破壊"
  , "battle.result.neutral-bases-controlled": "すべての中立拠点を制圧"
  , "battle.result.deck-out": "相手がカードを引けない"
  , "battle.result.quit": "相手が投了"
  , "deck.menu": "メニュー"
  , "deck.title": "デッキ構築"
  , "deck.untitled": "名称未設定のデッキ"
  , "deck.unsaved": "未保存"
  , "deck.saved": "保存済み"
  , "deck.save": "保存"
  , "deck.saved-decks": "保存済みデッキ"
  , "deck.new": "新しいデッキ"
  , "deck.limit-reached": "ローカルデッキの上限に達しました。"
  , "deck.none-saved": "保存済みデッキはありません。"
  , "deck.cards": "カード"
  , "deck.contents": "内容"
  , "deck.add-cards": "一覧からカードを追加してください。"
  , "deck.add": "追加"
  , "deck.auto-build": "お任せで40枚にする"
  , "deck.remove": "削除"
  , "deck.deck": "デッキ"
  , "deck.name": "名前"
  , "deck.battle-ready": "対戦可能"
  , "deck.draft": "編集中"
  , "deck.delete-deck": "デッキを削除"
  , "deck.stats": "統計"
  , "deck.loading": "デッキデータを読み込み中"
  , "deck.close": "閉じる"
  , "deck.delete": "削除"
  , "deck.cancel": "キャンセル"
  , "deck.discard": "破棄"
  , "deck.unsaved-changes": "未保存の変更"
  , "deck.unsaved-message": "このデッキを離れる前に、変更の扱いを選択してください。"
  , "deck.delete-message": "この保存済みデッキはこのブラウザーから削除されます。"
  , "deck.return-menu": "メニューに戻る"
  , "deck.search": "検索"
  , "deck.type": "種類"
  , "deck.attribute": "属性"
  , "deck.cost": "コスト"
  , "deck.all": "すべて"
  , "deck.name.required": "デッキ名を入力してください。"
  , "deck.sort": "並び順"
  , "deck.sort.name": "名前順"
  , "deck.sort.cost-asc": "コスト昇順"
  , "deck.sort.cost-desc": "コスト降順"
  , "deck.sort.type": "種類順"
  , "deck.sort.attribute": "属性順"
  , "card.artwork-unavailable": "画像を表示できません"
};

const ENGLISH: Readonly<Record<string, string>> = {
  "menu.subtitle": "Original digital card game prototype",
  "menu.cpu-battle": "CPU Battle",
  "menu.deck-building": "Deck Building",
  "menu.cpu-battle.description": "Play a local CPU match after battle rules arrive.",
  "menu.deck-building.description": "Prepare and tune local decks after deck storage arrives.",
  "menu.available-later": "Available in a later unit of work.",
  "menu.catalog-loading": "Catalog loading",
  "loading.catalog": "Loading catalog",
  "loading.destination": "Opening destination",
  "battle.board": "Board",
  "battle.column": "Column",
  "battle.row": "row",
  "battle.normal-square": "Normal square",
  "battle.cpu-base": "CPU Base",
  "battle.player-base": "Player Base",
  "battle.neutral-base": "Neutral Base",
  "battle.health": "HP",
  "battle.attack": "ATK",
  "battle.cost": "Cost",
  "battle.selected-summon": "selected summon destination",
  "battle.available-destination": "available destination",
  "battle.movement-origin": "movement origin",
  "battle.movement-path": "movement path steps",
  "battle.provisional-position": "provisional creature position",
  "battle.occupied-by": "occupied by",
  "battle.controlled-by": "controlled by",
  "battle.player-controlled": "Player controlled",
  "battle.cpu-controlled": "CPU controlled",
  "battle.unclaimed": "Unclaimed",
  "battle.unknown": "Unknown",
  "battle.card-unavailable": "Card data is unavailable.",
  "battle.resonance.inactive": "Water resonance is not active in this lane.",
  "battle.resonance.already-used": "Water resonance was already used in this lane this turn.",
  "battle.resonance.no-target": "There is no water resonance target in this lane.",
  "battle.resonance.unknown": "The action could not be completed."
  , "battle.status": "Status"
  , "battle.status.available": "Available"
  , "battle.status.unavailable": "Unavailable"
  , "battle.result.victory": "Victory"
  , "battle.result.defeat": "Defeat"
  , "battle.result.reason": "Reason"
  , "battle.result.turn": "Turn"
  , "battle.result.rematch": "Rematch"
  , "battle.result.return": "Return"
  , "battle.result.base-destroyed": "Enemy base destroyed"
  , "battle.result.neutral-bases-controlled": "All neutral bases controlled"
  , "battle.result.deck-out": "Opponent could not draw"
  , "battle.result.quit": "Opponent conceded"
  , "deck.menu": "Menu"
  , "deck.title": "Deck Building"
  , "deck.untitled": "Untitled Deck"
  , "deck.unsaved": "Unsaved"
  , "deck.saved": "Saved"
  , "deck.save": "Save"
  , "deck.saved-decks": "Saved Decks"
  , "deck.new": "New Deck"
  , "deck.limit-reached": "Local deck limit reached."
  , "deck.none-saved": "No saved decks yet."
  , "deck.cards": "Cards"
  , "deck.contents": "Contents"
  , "deck.add-cards": "Add cards from the list."
  , "deck.add": "Add"
  , "deck.auto-build": "Auto-complete to 40"
  , "deck.remove": "Remove"
  , "deck.deck": "Deck"
  , "deck.name": "Name"
  , "deck.battle-ready": "Battle-ready"
  , "deck.draft": "Draft"
  , "deck.delete-deck": "Delete Deck"
  , "deck.stats": "Stats"
  , "deck.loading": "Loading deck data"
  , "deck.close": "Close"
  , "deck.delete": "Delete"
  , "deck.cancel": "Cancel"
  , "deck.discard": "Discard"
  , "deck.unsaved-changes": "Unsaved Changes"
  , "deck.unsaved-message": "Choose how to handle the current deck before leaving it."
  , "deck.delete-message": "This saved deck will be removed from this browser."
  , "deck.return-menu": "Return to Menu"
  , "deck.search": "Search"
  , "deck.type": "Type"
  , "deck.attribute": "Attribute"
  , "deck.cost": "Cost"
  , "deck.all": "All"
  , "deck.name.required": "Deck name is required."
  , "deck.sort": "Sort"
  , "deck.sort.name": "Name"
  , "deck.sort.cost-asc": "Cost up"
  , "deck.sort.cost-desc": "Cost down"
  , "deck.sort.type": "Type"
  , "deck.sort.attribute": "Attribute"
  , "card.artwork-unavailable": "artwork unavailable"
};

const JAPANESE_CARD_TEXT: Readonly<Record<string, { readonly name: string; readonly effectText: string }>> = {
  "AK-001": { name: "火種のリクルート", effectText: "なし" },
  "AK-002": { name: "ファイアボルト", effectText: "敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に2ダメージを与える。" },
  "AK-003": { name: "スパーク・ランサー", effectText: "召喚時：敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に1ダメージを与える。" },
  "AK-004": { name: "炎核のバーサーカー", effectText: "このクリーチャーがいるレーンで自分が火共鳴しているなら、このクリーチャーの攻撃力を+2する。" },
  "AK-005": { name: "フレイムバースト", effectText: "敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に4ダメージを与える。" },
  "AK-006": { name: "ブレイズ・コマンダー", effectText: "召喚時：他の味方クリーチャー1体を選択する。そのクリーチャーの攻撃力を+2する。" },
  "AK-007": { name: "爆炎のメイジ", effectText: "召喚時：敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に3ダメージを与える。" },
  "AK-008": { name: "烈火の号令", effectText: "このターン、レーンを1つ選択する。そのレーン上のすべての味方クリーチャーの攻撃力を+2する。" },
  "AK-009": { name: "紅蓮旗のキャプテン", effectText: "このクリーチャーが場にいる限り、同じレーン上の他のすべての味方クリーチャーの攻撃力を+1する。" },
  "AK-010": { name: "ブレイズフェニックス", effectText: "破壊時：このクリーチャーが破壊される直前にいたレーン上のすべての敵クリーチャーと攻撃可能な拠点に2ダメージを与える。" },
  "AK-011": { name: "ボルカニック・レイン", effectText: "レーンを1つ選択する。そのレーン上のすべての敵クリーチャーと攻撃可能な拠点に5ダメージを与える。" },
  "AK-012": { name: "獄炎竜ヴァルガス", effectText: "召喚時：敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に7ダメージを与える。この効果で敵クリーチャーを破壊したなら、そのクリーチャーと同じレーン上の他のすべての敵クリーチャーに3ダメージを与える。" },
  "AK-013": { name: "雫のシーカー", effectText: "このクリーチャーは1ターンに最大2マス移動できる。" },
  "AK-014": { name: "アクア・ガード", effectText: "なし" },
  "AK-015": { name: "ウォーターステップ", effectText: "このターン、味方クリーチャー1体を選択する。そのクリーチャーの移動力を+1する。カードを1枚引く。" },
  "AK-016": { name: "ブルーフィンの学究", effectText: "召喚時：カードを1枚引く。" },
  "AK-017": { name: "ディープ・リサーチ", effectText: "カードを2枚引く。" },
  "AK-018": { name: "潮路のダンサー", effectText: "召喚時：他の味方クリーチャー1体を選択する。そのクリーチャーの周囲8マスにある空いている通常マスを1つ選択する。そのクリーチャーを選択したマスへ移動させる。" },
  "AK-019": { name: "フロウ・コントロール", effectText: "クリーチャー1体を選択する。そのクリーチャーと同じレーン上の空いている通常マスを1つ選択する。そのクリーチャーを選択したマスへ移動させる。" },
  "AK-020": { name: "バブル・ジャグラー", effectText: "召喚時：同じレーン上の敵クリーチャー1体を選択する。そのクリーチャーを所有者の手札に戻す。" },
  "AK-021": { name: "蒼潮のナビゲーター", effectText: "このクリーチャーが場にいる限り、同じレーン上の他のすべての味方クリーチャーの移動力を+1する。" },
  "AK-022": { name: "アビサル・セージ", effectText: "このクリーチャーは1ターンに最大2マス移動できる。このクリーチャーが移動したとき、各ターンに一度、カードを1枚引く。" },
  "AK-023": { name: "スティル・タイド", effectText: "次の自分のターン開始時まで、すべての敵クリーチャーの移動力を0にする。カードを3枚引く。" },
  "AK-024": { name: "海嘯竜リヴァイアサン", effectText: "召喚時：このクリーチャーと同じレーン上の他のすべてのクリーチャーを所有者の手札に戻す。" },
  "AK-025": { name: "ゲイルホーンの戦士", effectText: "自分の最大PPが5以上なら、このクリーチャーを+1/+1する。" },
  "AK-026": { name: "ウィンド・コンパス", effectText: "自分のデッキからランダムなクリーチャーカード1枚を手札に加える。" },
  "AK-027": { name: "グロウス・ドルイド", effectText: "召喚時：自分の最大PPを1増やす。" },
  "AK-028": { name: "ブリーズ・スプライト", effectText: "自分が風共鳴しているレーンがあるなら、このカードのコストは1になる。" },
  "AK-029": { name: "エメラルド・サイクル", effectText: "自分の最大PPを1増やす。自分の最大PPが7以上なら、カードを1枚引く。" },
  "AK-030": { name: "クラウド・ビースト", effectText: "自分の最大PPが7以上なら、このクリーチャーを+2/+2する。" },
  "AK-031": { name: "コール・オブ・タイタン", effectText: "自分のデッキから元のコストが8以上のランダムなクリーチャーカード1枚を手札に加える。そのカードのコストを3減らす。" },
  "AK-032": { name: "ストーム・シェパード", effectText: "召喚時：自分の最大PPが8以上なら、このクリーチャーと同じレーン上の他のすべての味方クリーチャーを+2/+2する。" },
  "AK-033": { name: "テンペスト・アーキテクト", effectText: "このクリーチャーが場にいる限り、自分の手札のすべてのクリーチャーカードのコストを1減らす。" },
  "AK-034": { name: "嵐冠のグリフォン", effectText: "召喚時：自分の最大PPが10以上なら、自分のデッキから元のコストが4以下のランダムなクリーチャーカード1枚を手札に加える。そのカードのコストを0にする。" },
  "AK-035": { name: "天空のコロッサス", effectText: "なし" },
  "AK-036": { name: "天嵐巨神アネモス", effectText: "このカードのコストは、自分の風共鳴しているレーン1つにつき3減る。" },
  "AK-037": { name: "ヒーリング・レイ", effectText: "味方クリーチャーまたは自分の拠点1つを選択する。その対象の体力を3回復する。" },
  "AK-038": { name: "ルミナス・サモナー", effectText: "召喚時：このクリーチャーの周囲8マスにある空いている通常マスを1つ選択する。そのマスに光属性1/1/3の「ルミナス・ウォール」トークンを1体出す。" },
  "AK-039": { name: "セイクリッド・シールド", effectText: "味方クリーチャー1体を選択する。そのクリーチャーを+0/+4する。" },
  "AK-040": { name: "ルミナス・ガード", effectText: "なし" },
  "AK-041": { name: "ホーリー・サイレンス", effectText: "敵クリーチャー1体を選択する。そのクリーチャーの効果を無効にする。" },
  "AK-042": { name: "光壁のアーキテクト", effectText: "召喚時：このクリーチャーと同じレーン上の空いている通常マスを1つ選択する。そのマスに光属性1/1/3の「ルミナス・ウォール」トークンを1体出す。" },
  "AK-043": { name: "シャイニング・キャプテン", effectText: "このクリーチャーが場にいる限り、同じレーン上のすべての味方トークンを+1/+2する。" },
  "AK-044": { name: "フォートレス・ライン", effectText: "レーンを1つ選択する。そのレーン上の空いている通常マスを3つ選択する。そのマスに光属性1/1/3の「ルミナス・ウォール」トークンを1体ずつ出す。すべての味方トークンを+0/+2する。" },
  "AK-045": { name: "静寂のインクイジター", effectText: "召喚時：このクリーチャーと同じレーン上のすべての敵クリーチャーの効果を無効にする。" },
  "AK-046": { name: "グローリアス・チャンピオン", effectText: "召喚時：このクリーチャーと同じレーン上の空いている通常マスを2つ選択する。そのマスに光属性1/1/3の「ルミナス・ウォール」トークンを1体ずつ出す。このクリーチャーが場にいる限り、味方トークン1体につき、このクリーチャーを+1/+1する。" },
  "AK-047": { name: "ディバイン・ドミニオン", effectText: "すべての敵クリーチャーの効果を無効にする。すべての味方クリーチャーを+1/+4する。" },
  "AK-048": { name: "光臨天使セラフィエル", effectText: "召喚時：このクリーチャーと同じレーン上の空いている通常マスを3つ選択する。そのマスに光属性1/1/3の「ルミナス・ウォール」トークンを1体ずつ出す。すべての味方トークンを+3/+3する。" },
  "AK-049": { name: "グレイヴ・スクワイア", effectText: "破壊時：カードを1枚引く。" },
  "AK-050": { name: "ソウル・トレード", effectText: "味方クリーチャー1体を選択する。そのクリーチャーを破壊する。この効果で破壊したなら、カードを2枚引く。" },
  "AK-051": { name: "ネクロ・アプレンティス", effectText: "破壊時：このクリーチャーが破壊されたマスの周囲8マスにあるランダムな空いている通常マスに、闇属性1/1/1の「冥影の残滓」トークンを1体出す。" },
  "AK-052": { name: "カースド・ブッチャー", effectText: "召喚時：他の味方クリーチャー1体を選択する。そのクリーチャーを破壊する。この効果で破壊したなら、このクリーチャーを+3/+3する。" },
  "AK-053": { name: "黒鉄のデュラハン", effectText: "なし" },
  "AK-054": { name: "グレイヴ・リコール", effectText: "自分の墓地のクリーチャーカード2枚を選択する。そのカードを手札に加える。" },
  "AK-055": { name: "デス・センテンス", effectText: "敵クリーチャー1体を選択する。そのクリーチャーを破壊する。" },
  "AK-056": { name: "魂喰らいのハーベスター", effectText: "他の味方クリーチャーが破壊されたとき、このクリーチャーを+1/+1する。" },
  "AK-057": { name: "ネクロマンサー・リリス", effectText: "召喚時：自分の墓地の元のコストが3以下のクリーチャーカード1枚を選択する。このクリーチャーの周囲8マスにある空いている通常マスを1つ選択する。そのカードを選択したマスに出す。" },
  "AK-058": { name: "アビス・リーパー", effectText: "破壊時：自分の墓地の元のコストが5以下のランダムなクリーチャーカード1枚を、このクリーチャーが破壊されたマスの周囲8マスにあるランダムな空いている通常マスに出す。" },
  "AK-059": { name: "リザレクション・ゲート", effectText: "自分の墓地の元のコストが5以下のクリーチャーカード2枚を選択する。空いている召喚可能マスを2つ選択する。そのカードを選択したマスに1枚ずつ出す。" },
  "AK-060": { name: "冥界王ノクティス", effectText: "召喚時：このクリーチャーと同じレーン上の他のすべてのクリーチャーを破壊する。この効果で破壊したクリーチャー1体につき、このクリーチャーを+1/+1する。" },
  "AK-T-001": { name: "ルミナス・ウォール", effectText: "なし" },
  "AK-T-002": { name: "冥影の残滓", effectText: "なし" }
};

const JAPANESE_TYPES: Readonly<Record<string, string>> = {
  creature: "クリーチャー",
  spell: "スペル",
  "creature-token": "クリーチャー（トークン）"
};

const JAPANESE_ATTRIBUTES: Readonly<Record<string, string>> = {
  fire: "火",
  water: "水",
  wind: "風",
  light: "光",
  dark: "闇"
};

export interface LocalizedCardPresentation {
  readonly name: string;
  readonly effectText: string;
  readonly type: string;
  readonly attribute: string;
}

/** Localizes display-only fields while retaining the catalog record for rules. */
export function localizeCardPresentation(
  card: Pick<CardMasterRecord, "id" | "name" | "effectText"> & { readonly type: string; readonly attribute: string },
  locale: UiLocale | undefined
): LocalizedCardPresentation {
  if (locale === "en") {
    return card;
  }

  const japanese = JAPANESE_CARD_TEXT[card.id];
  return {
    name: japanese?.name ?? `カード ${card.id}`,
    effectText: japanese?.effectText ?? "効果テキストは日本語版カード一覧を参照",
    type: JAPANESE_TYPES[card.type] ?? card.type,
    attribute: JAPANESE_ATTRIBUTES[card.attribute] ?? card.attribute
  };
}

/** Resolves a card-type enum only at the presentation boundary. */
export function localizeCardType(locale: UiLocale | undefined, type: string): string {
  return locale === "en" ? type : JAPANESE_TYPES[type] ?? type;
}

/** Resolves a card-attribute enum only at the presentation boundary. */
export function localizeCardAttribute(
  locale: UiLocale | undefined,
  attribute: string
): string {
  return locale === "en" ? attribute : JAPANESE_ATTRIBUTES[attribute] ?? attribute;
}

/** Japanese is the safe fallback for incomplete locale catalogs. */
export function uiText(locale: UiLocale | undefined, key: string, fallback?: string): string {
  return (locale === "en" ? ENGLISH : JAPANESE)[key] ?? JAPANESE[key] ?? fallback ?? key;
}

export function localizeMenuText(locale: UiLocale | undefined, text: string, kind: "title" | "subtitle" | "action" | "description" | "version" | "reason"): string {
  if (kind === "title" && text === "Project Ankake") return text;
  if (kind === "subtitle") return uiText(locale, "menu.subtitle", text);
  if (kind === "action") return text === "CPU Battle" ? uiText(locale, "menu.cpu-battle") : text === "Deck Building" ? uiText(locale, "menu.deck-building") : text;
  if (kind === "description") return text.startsWith("Play a local CPU") ? uiText(locale, "menu.cpu-battle.description") : text.startsWith("Prepare and tune") ? uiText(locale, "menu.deck-building.description") : text;
  if (kind === "version") {
    const version = /^Catalog (.+)$/.exec(text)?.[1];
    return version ? (locale === "en" ? `Catalog ${version}` : `カタログ ${version}`) : uiText(locale, "menu.catalog-loading", text);
  }
  if (kind === "reason" && (text.startsWith("Available in a later") || text.startsWith("Coming in UOW"))) return uiText(locale, "menu.available-later");
  return text;
}

export function localizeLoadingLabel(locale: UiLocale | undefined, label: string): string {
  return label === "Opening destination" ? uiText(locale, "loading.destination") : uiText(locale, "loading.catalog", label);
}

export function localizeBattleReason(locale: UiLocale | undefined, reason: string): string {
  return reason === "Card data is unavailable." ? uiText(locale, "battle.card-unavailable") : reason;
}

export function localizeDeckValidationIssue(locale: UiLocale | undefined, code: string, fallback: string): string {
  return uiText(locale, code, fallback);
}
