import {
  CARD_ATTRIBUTES,
  CARD_TYPES,
  type CardAttribute,
  type CardMasterRecord,
  type CardType,
  type StaticCatalogSnapshot
} from "../catalog/types";
import {
  DECK_BATTLE_READY_CARD_COUNT,
  DECK_DEFAULT_NAME,
  DECK_MAX_CARD_COPIES,
  type CardId,
  type DeckCardCount,
  type DeckDraft,
  type DeckMutationResult,
  type SavedDeck,
  type DeckStats
} from "./types";

export interface NewDeckDraftInput {
  readonly deckId: string;
  readonly now: string;
  readonly name?: string;
}

export function normalizeDeckName(name: string): string {
  return name.trim().replace(/\s+/gu, " ");
}

export function sortDeckCards(cards: readonly DeckCardCount[]): readonly DeckCardCount[] {
  return [...cards]
    .filter((entry) => entry.count > 0)
    .sort((left, right) => left.cardId.localeCompare(right.cardId, "en"));
}

export function normalizeDeckCards(cards: readonly DeckCardCount[]): readonly DeckCardCount[] {
  const counts = new Map<CardId, number>();

  for (const entry of cards) {
    const current = counts.get(entry.cardId) ?? 0;
    counts.set(entry.cardId, current + entry.count);
  }

  return sortDeckCards(
    [...counts.entries()].map(([cardId, count]) => ({
      cardId,
      count
    }))
  );
}

export function createNewDeckDraft(input: NewDeckDraftInput): DeckDraft {
  return {
    deckId: input.deckId,
    name: normalizeDeckName(input.name ?? DECK_DEFAULT_NAME),
    cards: [],
    createdAt: input.now
  };
}

export function createDraftFromSavedDeck(savedDeck: SavedDeck): DeckDraft {
  return {
    deckId: savedDeck.deckId,
    name: savedDeck.name,
    cards: normalizeDeckCards(savedDeck.cards),
    createdAt: savedDeck.createdAt,
    updatedAt: savedDeck.updatedAt,
    savedSnapshot: {
      ...savedDeck,
      cards: normalizeDeckCards(savedDeck.cards)
    }
  };
}

export function renameDeckDraft(draft: DeckDraft, name: string): DeckDraft {
  return {
    ...draft,
    name
  };
}

export function getDeckTotalCount(cards: readonly DeckCardCount[]): number {
  return cards.reduce((total, entry) => total + entry.count, 0);
}

export function getCardCount(cards: readonly DeckCardCount[], cardId: CardId): number {
  return cards.find((entry) => entry.cardId === cardId)?.count ?? 0;
}

export function canAddCardToDraft(
  draft: DeckDraft,
  cardId: CardId,
  catalog: StaticCatalogSnapshot
): DeckMutationResult {
  if (catalog.tokensById.has(cardId)) {
    return {
      accepted: false,
      draft,
      reason: "token-card"
    };
  }

  if (!catalog.cardsById.has(cardId)) {
    return {
      accepted: false,
      draft,
      reason: "unknown-card"
    };
  }

  if (getDeckTotalCount(draft.cards) >= DECK_BATTLE_READY_CARD_COUNT) {
    return {
      accepted: false,
      draft,
      reason: "deck-limit"
    };
  }

  if (getCardCount(draft.cards, cardId) >= DECK_MAX_CARD_COPIES) {
    return {
      accepted: false,
      draft,
      reason: "copy-limit"
    };
  }

  return {
    accepted: true,
    draft
  };
}

export function addCardToDraft(
  draft: DeckDraft,
  cardId: CardId,
  catalog: StaticCatalogSnapshot
): DeckMutationResult {
  const check = canAddCardToDraft(draft, cardId, catalog);

  if (!check.accepted) {
    return check;
  }

  const currentCount = getCardCount(draft.cards, cardId);
  const nextCards =
    currentCount === 0
      ? [...draft.cards, { cardId, count: 1 }]
      : draft.cards.map((entry) =>
          entry.cardId === cardId
            ? {
                ...entry,
                count: entry.count + 1
              }
            : entry
        );

  return {
    accepted: true,
    draft: {
      ...draft,
      cards: normalizeDeckCards(nextCards)
    }
  };
}

export function removeCardFromDraft(draft: DeckDraft, cardId: CardId): DeckMutationResult {
  const currentCount = getCardCount(draft.cards, cardId);

  if (currentCount <= 0) {
    return {
      accepted: false,
      draft,
      reason: "card-not-present"
    };
  }

  const nextCards = draft.cards
    .map((entry) =>
      entry.cardId === cardId
        ? {
            ...entry,
            count: entry.count - 1
          }
        : entry
    )
    .filter((entry) => entry.count > 0);

  return {
    accepted: true,
    draft: {
      ...draft,
      cards: normalizeDeckCards(nextCards)
    }
  };
}

export function toSavedDeck(draft: DeckDraft, now: string): SavedDeck {
  return {
    deckId: draft.deckId,
    name: normalizeDeckName(draft.name),
    cards: normalizeDeckCards(draft.cards),
    createdAt: draft.createdAt,
    updatedAt: now
  };
}

export function markDraftSaved(draft: DeckDraft, savedDeck: SavedDeck): DeckDraft {
  return createDraftFromSavedDeck(savedDeck);
}

export function areDeckCardsEqual(
  left: readonly DeckCardCount[],
  right: readonly DeckCardCount[]
): boolean {
  const normalizedLeft = normalizeDeckCards(left);
  const normalizedRight = normalizeDeckCards(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every(
    (entry, index) =>
      entry.cardId === normalizedRight[index]?.cardId &&
      entry.count === normalizedRight[index]?.count
  );
}

export function isDraftDirty(draft: DeckDraft): boolean {
  if (!draft.savedSnapshot) {
    return draft.name !== DECK_DEFAULT_NAME || draft.cards.length > 0;
  }

  return (
    normalizeDeckName(draft.name) !== draft.savedSnapshot.name ||
    !areDeckCardsEqual(draft.cards, draft.savedSnapshot.cards)
  );
}

export function compareCardsForDeckContents(
  left: CardMasterRecord,
  right: CardMasterRecord
): number {
  const costComparison = left.cost - right.cost;

  if (costComparison !== 0) {
    return costComparison;
  }

  return left.name.localeCompare(right.name, "en") || left.id.localeCompare(right.id, "en");
}

export function getDeckCardsWithRecords(
  cards: readonly DeckCardCount[],
  catalog: StaticCatalogSnapshot
): ReadonlyArray<{ readonly card: CardMasterRecord; readonly count: number }> {
  return normalizeDeckCards(cards)
    .map((entry) => {
      const card = catalog.cardsById.get(entry.cardId);
      return card ? { card, count: entry.count } : undefined;
    })
    .filter((entry): entry is { readonly card: CardMasterRecord; readonly count: number } =>
      Boolean(entry)
    )
    .sort((left, right) => compareCardsForDeckContents(left.card, right.card));
}

export function createEmptyDeckStats(): DeckStats {
  return {
    totalCards: 0,
    typeCounts: createZeroRecord(CARD_TYPES),
    attributeCounts: createZeroRecord(CARD_ATTRIBUTES),
    costBuckets: [
      { label: "1以下", count: 0 },
      { label: "2", count: 0 },
      { label: "3", count: 0 },
      { label: "4", count: 0 },
      { label: "5", count: 0 },
      { label: "6", count: 0 },
      { label: "7", count: 0 },
      { label: "8以上", count: 0 }
    ]
  };
}

export function createDeckStats(
  cards: readonly DeckCardCount[],
  catalog: StaticCatalogSnapshot
): DeckStats {
  const typeCounts = createZeroRecord<CardType>(CARD_TYPES);
  const attributeCounts = createZeroRecord<CardAttribute>(CARD_ATTRIBUTES);
  const costBuckets = [
    { label: "1以下", count: 0 },
    { label: "2", count: 0 },
    { label: "3", count: 0 },
    { label: "4", count: 0 },
    { label: "5", count: 0 },
    { label: "6", count: 0 },
    { label: "7", count: 0 },
    { label: "8以上", count: 0 }
  ];

  for (const entry of getDeckCardsWithRecords(cards, catalog)) {
    typeCounts[entry.card.type] += entry.count;
    attributeCounts[entry.card.attribute] += entry.count;

    if (entry.card.cost <= 1) {
      costBuckets[0].count += entry.count;
    } else {
      costBuckets[Math.min(entry.card.cost, 8) - 1].count += entry.count;
    }
  }

  return {
    totalCards: getDeckTotalCount(cards),
    typeCounts,
    attributeCounts,
    costBuckets
  };
}

function createZeroRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}
