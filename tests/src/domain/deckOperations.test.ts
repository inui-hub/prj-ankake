import {
  DECK_MAX_CARD_COPIES,
  addCardToDraft,
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
});
