import {
  DECK_MAX_SAVED_DECKS,
  projectDeckBuildingViewModel
} from "@ankake/domain";
import fc from "fast-check";
import {
  cardSearchCriteriaArbitrary,
  deckDraftArbitrary,
  savedDeckArbitrary
} from "../generators/deckGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("deck projection", () => {
  it("projects cap state when twenty decks are saved", () => {
    const draft = fc.sample(deckDraftArbitrary, { numRuns: 1 })[0];
    const savedDecks = Array.from({ length: DECK_MAX_SAVED_DECKS }, (_, index) => ({
      deckId: `deck-${index}`,
      name: `Deck ${index}`,
      cardCount: 0,
      battleReady: false,
      updatedAt: "2026-07-25T00:00:00.000Z"
    }));

    const viewModel = projectDeckBuildingViewModel({
      catalog: validCatalogSnapshotFixture,
      draft,
      savedDecks
    });

    expect(viewModel.capState.reached).toBe(true);
  });

  it("keeps projected contents and card rows consistent with source state", () => {
    fc.assert(
      fc.property(deckDraftArbitrary, cardSearchCriteriaArbitrary, fc.array(savedDeckArbitrary, { maxLength: 5 }), (draft, criteria, savedDecks) => {
        const summaries = savedDecks.map((deck) => ({
          deckId: deck.deckId,
          name: deck.name,
          cardCount: deck.cards.reduce((total, entry) => total + entry.count, 0),
          battleReady: false,
          updatedAt: deck.updatedAt
        }));
        const viewModel = projectDeckBuildingViewModel({
          catalog: validCatalogSnapshotFixture,
          draft,
          savedDecks: summaries,
          criteria
        });

        expect(viewModel.cardRows.every((row) => row.card.deckBuildable)).toBe(true);
        expect(viewModel.stats.totalCards).toBe(viewModel.validation.cardCount);
        expect(viewModel.deckContents.every((row) => row.count > 0)).toBe(true);
      }),
      { numRuns: 60 }
    );
  });
});
