import {
  createNewDeckDraft,
  validateDeckDraft
} from "@ankake/domain";
import fc from "fast-check";
import {
  battleReadyDeckCardsArbitrary,
  deckDraftArbitrary
} from "../generators/deckGenerators";
import { TOKEN_IDS, validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("deck validation", () => {
  it("rejects token cards in saved deck content", () => {
    const draft = createNewDeckDraft({
      deckId: "deck-token",
      now: "2026-07-25T00:00:00.000Z",
      name: "Token Deck"
    });
    const result = validateDeckDraft(
      {
        ...draft,
        cards: [{ cardId: TOKEN_IDS[0], count: 1 }]
      },
      validCatalogSnapshotFixture
    );

    expect(result.saveable).toBe(false);
    expect(result.issues.some((issue) => issue.code === "deck.card.token")).toBe(true);
  });

  it("marks exactly forty valid cards as battle-ready", () => {
    fc.assert(
      fc.property(battleReadyDeckCardsArbitrary, (cards) => {
        const draft = createNewDeckDraft({
          deckId: "deck-ready",
          now: "2026-07-25T00:00:00.000Z",
          name: "Ready Deck"
        });
        const result = validateDeckDraft({ ...draft, cards }, validCatalogSnapshotFixture);

        expect(result.saveable).toBe(true);
        expect(result.battleReady).toBe(true);
      }),
      { numRuns: 40 }
    );
  });

  it("keeps battle-ready as a stricter state than saveable", () => {
    fc.assert(
      fc.property(deckDraftArbitrary, (draft) => {
        const result = validateDeckDraft(draft, validCatalogSnapshotFixture);

        if (result.battleReady) {
          expect(result.saveable).toBe(true);
          expect(result.cardCount).toBe(40);
        }

        if (result.saveable && result.cardCount !== 40) {
          expect(result.battleReady).toBe(false);
        }
      }),
      { numRuns: 80 }
    );
  });
});
