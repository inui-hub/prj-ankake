import type { CardMasterRecord, StaticCatalogSnapshot } from "../catalog/types";
import { canAddCardToDraft, getCardCount } from "./operations";
import {
  type CardSearchCriteria,
  type DeckCardRow,
  type DeckDraft
} from "./types";

export const DEFAULT_CARD_SEARCH_CRITERIA: CardSearchCriteria = {
  query: "",
  type: "all",
  attribute: "all",
  cost: "all",
  sortKey: "cost",
  sortDirection: "asc"
};

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

export function normalizeCardSearchCriteria(
  criteria: Partial<CardSearchCriteria>
): CardSearchCriteria {
  return {
    ...DEFAULT_CARD_SEARCH_CRITERIA,
    ...criteria,
    query: criteria.query ?? DEFAULT_CARD_SEARCH_CRITERIA.query
  };
}

export function searchDeckBuildableCards(
  catalog: StaticCatalogSnapshot,
  draft: DeckDraft,
  criteria: CardSearchCriteria
): readonly DeckCardRow[] {
  const normalizedCriteria = normalizeCardSearchCriteria(criteria);
  const normalizedQuery = normalizeSearchText(normalizedCriteria.query);

  return catalog.cards
    .filter((card) => matchesQuery(card, normalizedQuery))
    .filter((card) =>
      normalizedCriteria.type === "all" ? true : card.type === normalizedCriteria.type
    )
    .filter((card) =>
      normalizedCriteria.attribute === "all"
        ? true
        : card.attribute === normalizedCriteria.attribute
    )
    .filter((card) => matchesCostFilter(card, normalizedCriteria.cost))
    .sort((left, right) => compareCards(left, right, normalizedCriteria))
    .map((card) => {
      const currentCount = getCardCount(draft.cards, card.id);
      const addCheck = canAddCardToDraft(draft, card.id, catalog);
      return {
        card,
        currentCount,
        canAdd: addCheck.accepted,
        addDisabledReason: addCheck.accepted
          ? undefined
          : getAddDisabledReason(addCheck.reason)
      };
    });
}

function matchesQuery(card: CardMasterRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  return (
    normalizeSearchText(card.name).includes(query) ||
    normalizeSearchText(card.effectText).includes(query) ||
    normalizeSearchText(card.id).includes(query)
  );
}

function matchesCostFilter(
  card: CardMasterRecord,
  costFilter: CardSearchCriteria["cost"]
): boolean {
  switch (costFilter) {
    case "0-2":
      return card.cost <= 2;
    case "3-5":
      return card.cost >= 3 && card.cost <= 5;
    case "6-plus":
      return card.cost >= 6;
    case "all":
      return true;
  }
}

function compareCards(
  left: CardMasterRecord,
  right: CardMasterRecord,
  criteria: CardSearchCriteria
): number {
  const direction = criteria.sortDirection === "asc" ? 1 : -1;
  const collator = new Intl.Collator(criteria.comparisonLocale ?? "ja");
  let comparison = 0;

  switch (criteria.sortKey) {
    case "cost":
      comparison = left.cost - right.cost;
      break;
    case "type":
      comparison = collator.compare(left.type, right.type);
      break;
    case "attribute":
      comparison = collator.compare(left.attribute, right.attribute);
      break;
    case "name":
      comparison = collator.compare(displayName(left, criteria), displayName(right, criteria));
      break;
  }

  return (
    comparison * direction ||
    collator.compare(displayName(left, criteria), displayName(right, criteria)) ||
    left.id.localeCompare(right.id, "en")
  );
}

function displayName(card: CardMasterRecord, criteria: CardSearchCriteria): string {
  return criteria.localizedNames?.[card.id] ?? card.name;
}

function getAddDisabledReason(reason: string): string {
  switch (reason) {
    case "copy-limit":
      return "Copy limit reached.";
    case "deck-limit":
      return "Deck is full.";
    case "token-card":
      return "Token cards cannot be added.";
    case "unknown-card":
      return "Card is unavailable.";
    default:
      return "Card cannot be added.";
  }
}
