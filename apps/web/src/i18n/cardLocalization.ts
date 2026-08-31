import type { BattleCardView, CardMasterRecord, PublicBattleView } from "@ankake/domain";
import { localizeCardPresentation } from "@ankake/ui";
import type { AppLocale } from "./localization";

/** English is the catalog source. Missing Japanese translations deliberately use Japanese text. */
export function localizedCardName(card: Pick<CardMasterRecord, "id" | "name">, locale: AppLocale): string {
  return locale === "en" ? card.name : localizeCardPresentation({ ...card, effectText: "", type: "", attribute: "" }, locale).name;
}

export function cardNameMap(cards: readonly CardMasterRecord[], locale: AppLocale): Readonly<Record<string, string>> {
  return Object.fromEntries(cards.map((card) => [card.id, localizedCardName(card, locale)]));
}

function localizeBattleCard(card: BattleCardView, locale: AppLocale): BattleCardView {
  if (locale === "en") return card;
  const presentation = localizeCardPresentation({
    id: card.catalogCardId,
    name: card.name,
    effectText: card.effectText,
    type: card.type,
    attribute: card.attribute,
  }, locale);
  return { ...card, name: presentation.name, effectText: presentation.effectText };
}

/** Keeps domain IDs intact while replacing only presentation fields for the UI. */
export function localizeBattleView(view: PublicBattleView, locale: AppLocale): PublicBattleView {
  return {
    ...view,
    playerHand: view.playerHand.map((card) => localizeBattleCard(card, locale)),
    boardSquares: view.boardSquares.map((square) => square.occupant ? { ...square, occupant: localizeBattleCard(square.occupant, locale) } : square)
  };
}
