import {
  DEFAULT_CARD_SEARCH_CRITERIA,
  DECK_DEFAULT_NAME,
  DECK_MAX_CARD_COPIES,
  DECK_MAX_SAVED_DECKS,
  createDraftFromSavedDeck,
  normalizeDeckCards,
  normalizeDeckName,
  type CardSearchCriteria,
  type DeckCardCount,
  type DeckDraft,
  type SavedDeck
} from "@ankake/domain";
import {
  serializeSavedDeck,
  type StoredDeckRecord
} from "@ankake/persistence";
import fc from "fast-check";
import { NORMAL_CARD_IDS, TOKEN_IDS } from "./catalogGenerators";

const DECK_ID_PREFIX = "deck-test-";
const BASE_TIMESTAMP = "2026-07-25T00:00:00.000Z";

export const deckIdArbitrary: fc.Arbitrary<string> = fc
  .uuid()
  .map((id) => `${DECK_ID_PREFIX}${id}`);

export const deckNameArbitrary: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 24 })
  .map((value) => normalizeDeckName(value) || DECK_DEFAULT_NAME);

export const deckCardCountsArbitrary: fc.Arbitrary<readonly DeckCardCount[]> = fc
  .uniqueArray(fc.constantFrom(...NORMAL_CARD_IDS), {
    minLength: 0,
    maxLength: 10,
    selector: (cardId) => cardId
  })
  .chain((cardIds) =>
    cardIds.length === 0
      ? fc.constant([])
      : fc
          .tuple(
            ...cardIds.map((cardId) =>
              fc.record({
                cardId: fc.constant(cardId),
                count: fc.integer({ min: 1, max: DECK_MAX_CARD_COPIES })
              })
            )
          )
          .map((entries) => normalizeDeckCards(entries))
  );

export const battleReadyDeckCardsArbitrary: fc.Arbitrary<readonly DeckCardCount[]> = fc
  .uniqueArray(fc.constantFrom(...NORMAL_CARD_IDS), {
    minLength: 10,
    maxLength: 10,
    selector: (cardId) => cardId
  })
  .map((cardIds) =>
    normalizeDeckCards(
      cardIds.map((cardId) => ({
        cardId,
        count: DECK_MAX_CARD_COPIES
      }))
    )
  );

export const savedDeckArbitrary: fc.Arbitrary<SavedDeck> = fc
  .tuple(deckIdArbitrary, deckNameArbitrary, deckCardCountsArbitrary, fc.integer({ min: 0, max: 1000 }))
  .map(([deckId, name, cards, minutes]) => {
    const createdAt = timestampPlus(minutes);
    return {
      deckId,
      name,
      cards,
      createdAt,
      updatedAt: timestampPlus(minutes + 1)
    };
  });

export const deckDraftArbitrary: fc.Arbitrary<DeckDraft> = savedDeckArbitrary.map((savedDeck) =>
  createDraftFromSavedDeck(savedDeck)
);

export const storedDeckRecordArbitrary: fc.Arbitrary<StoredDeckRecord> =
  savedDeckArbitrary.map((savedDeck) => serializeSavedDeck(savedDeck));

export const malformedStoredDeckRecordArbitrary: fc.Arbitrary<unknown> = fc.oneof(
  fc.record({
    schemaVersion: fc.constant("ankake.deck.unknown"),
    deckId: deckIdArbitrary,
    name: deckNameArbitrary,
    cards: deckCardCountsArbitrary,
    createdAt: fc.constant(BASE_TIMESTAMP),
    updatedAt: fc.constant(BASE_TIMESTAMP)
  }),
  fc.record({
    schemaVersion: fc.constant("ankake.deck.v1"),
    deckId: deckIdArbitrary,
    name: fc.constant(""),
    cards: fc.constant([]),
    createdAt: fc.constant(BASE_TIMESTAMP),
    updatedAt: fc.constant(BASE_TIMESTAMP)
  }),
  fc.record({
    schemaVersion: fc.constant("ankake.deck.v1"),
    deckId: deckIdArbitrary,
    name: deckNameArbitrary,
    cards: fc.constant([{ cardId: TOKEN_IDS[0], count: 1 }]),
    createdAt: fc.constant(BASE_TIMESTAMP),
    updatedAt: fc.constant(BASE_TIMESTAMP)
  }),
  fc.record({
    notADeck: fc.boolean()
  })
);

export const cardSearchCriteriaArbitrary: fc.Arbitrary<CardSearchCriteria> = fc.record({
  query: fc.oneof(fc.constant(""), fc.constant("AK-"), fc.constant("effect")),
  type: fc.constantFrom("all", "creature", "spell"),
  attribute: fc.constantFrom("all", "fire", "water", "wind", "light", "dark"),
  cost: fc.constantFrom("all", "0-2", "3-5", "6-plus"),
  sortKey: fc.constantFrom("name", "cost", "type", "attribute"),
  sortDirection: fc.constantFrom("asc", "desc")
});

export const deckMutationInputArbitrary: fc.Arbitrary<{
  readonly draft: DeckDraft;
  readonly cardId: string;
}> = fc.record({
  draft: deckDraftArbitrary,
  cardId: fc.constantFrom(...NORMAL_CARD_IDS)
});

export const maxSavedDecksArbitrary: fc.Arbitrary<readonly SavedDeck[]> = fc
  .uniqueArray(savedDeckArbitrary, {
    minLength: DECK_MAX_SAVED_DECKS,
    maxLength: DECK_MAX_SAVED_DECKS,
    selector: (deck) => deck.deckId
  });

export const defaultCriteriaFixture = DEFAULT_CARD_SEARCH_CRITERIA;

function timestampPlus(minutes: number): string {
  return new Date(Date.parse(BASE_TIMESTAMP) + minutes * 60_000).toISOString();
}
