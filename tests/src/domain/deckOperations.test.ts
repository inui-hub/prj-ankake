import {
  DECK_MAX_CARD_COPIES,
  addCardToDraft,
  compareCardsForDeckContents,
  createDeckStats,
  getCardCount,
  getDeckTotalCount,
  removeCardFromDraft
} from "@ankake/domain";
import fc from "fast-check";
import {
  deckMutationInputArbitrary,
  deckDraftArbitrary
} from "../generators/deckGenerators";
import { NORMAL_CARD_IDS, validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("deck operations", () => {
  it("adds a deck-buildable card until the copy limit is reached", () => {
    const draft = fc.sample(deckDraftArbitrary, { numRuns: 1 })[0];
    const cardId = NORMAL_CARD_IDS[0];
    const first = addCardToDraft(draft, cardId, validCatalogSnapshotFixture);

    expect(first.draft).not.toBe(draft);
    expect(getCardCount(first.draft.cards, cardId)).toBeGreaterThan(0);
  });

  it("never produces more than forty cards or four copies per card after add/remove", () => {
    fc.assert(
      fc.property(deckMutationInputArbitrary, ({ draft, cardId }) => {
        const added = addCardToDraft(draft, cardId, validCatalogSnapshotFixture).draft;
        const removed = removeCardFromDraft(added, cardId).draft;

        for (const nextDraft of [added, removed]) {
          expect(getDeckTotalCount(nextDraft.cards)).toBeLessThanOrEqual(40);
          expect(nextDraft.cards.every((entry) => entry.count <= DECK_MAX_CARD_COPIES)).toBe(true);
          expect(nextDraft.cards.every((entry) => entry.count > 0)).toBe(true);
        }
      }),
      { numRuns: 80 }
    );
  });

  it("sorts deck contents by cost, then card name, regardless of card type", () => {
    const creature = validCatalogSnapshotFixture.cards.find((card) => card.type === "creature");
    const spell = validCatalogSnapshotFixture.cards.find((card) => card.type === "spell");

    if (!creature || !spell) throw new Error("Fixture requires a creature and spell.");

    expect(compareCardsForDeckContents(
      { ...creature, cost: 6, name: "Zulu" },
      { ...spell, cost: 1, name: "Alpha" }
    )).toBeGreaterThan(0);
    expect(compareCardsForDeckContents(
      { ...creature, cost: 3, name: "Alpha" },
      { ...spell, cost: 3, name: "Zulu" }
    )).toBeLessThan(0);
  });

  it("groups cost statistics into the eight chart buckets", () => {
    const cards = validCatalogSnapshotFixture.cards.slice(0, 10).map((card, index) => ({
      ...card,
      cost: index === 9 ? 10 : index
    }));
    const catalog = {
      ...validCatalogSnapshotFixture,
      cards,
      cardsById: new Map(cards.map((card) => [card.id, card]))
    };
    const stats = createDeckStats(
      cards.map((card, index) => ({ cardId: card.id, count: index + 1 })),
      catalog
    );

    expect(stats.costBuckets).toEqual([
      { label: "1以下", count: 3 },
      { label: "2", count: 3 },
      { label: "3", count: 4 },
      { label: "4", count: 5 },
      { label: "5", count: 6 },
      { label: "6", count: 7 },
      { label: "7", count: 8 },
      { label: "8以上", count: 19 }
    ]);
  });
});
