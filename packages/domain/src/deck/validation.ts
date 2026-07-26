import type { StaticCatalogSnapshot } from "../catalog/types";
import {
  getDeckTotalCount,
  normalizeDeckCards,
  normalizeDeckName
} from "./operations";
import {
  DECK_BATTLE_READY_CARD_COUNT,
  DECK_MAX_CARD_COPIES,
  DECK_MAX_SAVED_DECKS,
  DECK_MIN_SAVEABLE_CARDS,
  DECK_NAME_MAX_LENGTH,
  type DeckDraft,
  type DeckValidationIssue,
  type DeckValidationResult,
  type SavedDeck,
  type SavedDeckSummary
} from "./types";

export function validateDeckDraft(
  draft: DeckDraft,
  catalog: StaticCatalogSnapshot
): DeckValidationResult {
  const issues: DeckValidationIssue[] = [];
  const normalizedName = normalizeDeckName(draft.name);
  const cards = normalizeDeckCards(draft.cards);
  const totalCards = getDeckTotalCount(cards);

  if (!normalizedName) {
    issues.push({
      code: "deck.name.required",
      message: "Deck name is required.",
      path: "name"
    });
  }

  if (normalizedName.length > DECK_NAME_MAX_LENGTH) {
    issues.push({
      code: "deck.name.too-long",
      message: `Deck name must be ${DECK_NAME_MAX_LENGTH} characters or fewer.`,
      path: "name"
    });
  }

  if (totalCards < DECK_MIN_SAVEABLE_CARDS) {
    issues.push({
      code: "deck.count.below-minimum",
      message: "Deck cannot contain a negative card count.",
      path: "cards"
    });
  }

  if (totalCards > DECK_BATTLE_READY_CARD_COUNT) {
    issues.push({
      code: "deck.count.above-maximum",
      message: `Deck cannot contain more than ${DECK_BATTLE_READY_CARD_COUNT} cards.`,
      path: "cards"
    });
  }

  for (const entry of cards) {
    if (!Number.isInteger(entry.count) || entry.count <= 0) {
      issues.push({
        code: "deck.card.count-invalid",
        message: "Deck card counts must be positive integers.",
        cardId: entry.cardId,
        path: `cards.${entry.cardId}`
      });
    }

    if (entry.count > DECK_MAX_CARD_COPIES) {
      issues.push({
        code: "deck.card.copy-limit",
        message: `No more than ${DECK_MAX_CARD_COPIES} copies of a card are allowed.`,
        cardId: entry.cardId,
        path: `cards.${entry.cardId}`
      });
    }

    if (catalog.tokensById.has(entry.cardId)) {
      issues.push({
        code: "deck.card.token",
        message: "Token cards cannot be added to decks.",
        cardId: entry.cardId,
        path: `cards.${entry.cardId}`
      });
    } else if (!catalog.cardsById.has(entry.cardId)) {
      issues.push({
        code: "deck.card.unknown",
        message: "Deck contains an unknown card.",
        cardId: entry.cardId,
        path: `cards.${entry.cardId}`
      });
    }
  }

  const saveable = issues.length === 0;

  return {
    issues,
    saveable,
    battleReady: saveable && totalCards === DECK_BATTLE_READY_CARD_COUNT,
    cardCount: totalCards
  };
}

export function isDeckSaveable(
  draft: DeckDraft,
  catalog: StaticCatalogSnapshot
): boolean {
  return validateDeckDraft(draft, catalog).saveable;
}

export function isDeckBattleReady(
  draft: DeckDraft,
  catalog: StaticCatalogSnapshot
): boolean {
  return validateDeckDraft(draft, catalog).battleReady;
}

export function createSavedDeckSummary(
  savedDeck: SavedDeck,
  catalog: StaticCatalogSnapshot
): SavedDeckSummary {
  const draft = {
    deckId: savedDeck.deckId,
    name: savedDeck.name,
    cards: savedDeck.cards,
    createdAt: savedDeck.createdAt,
    updatedAt: savedDeck.updatedAt,
    savedSnapshot: savedDeck
  };

  const validation = validateDeckDraft(draft, catalog);

  return {
    deckId: savedDeck.deckId,
    name: savedDeck.name,
    cardCount: validation.cardCount,
    battleReady: validation.battleReady,
    updatedAt: savedDeck.updatedAt
  };
}

export function canCreateNewSavedDeck(savedDeckCount: number): boolean {
  return savedDeckCount < DECK_MAX_SAVED_DECKS;
}

export function getPrimaryDeckValidationMessage(validation: DeckValidationResult): string | undefined {
  if (validation.issues.length > 0) {
    return validation.issues[0]?.message;
  }

  if (!validation.battleReady) {
    return `Saveable. Add ${DECK_BATTLE_READY_CARD_COUNT - validation.cardCount} cards to make it battle-ready.`;
  }

  return "Battle-ready.";
}
