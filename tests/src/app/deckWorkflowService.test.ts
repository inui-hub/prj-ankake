import {
  addDraftCard,
  createDeckWorkflowLoadingState,
  deleteSavedDeckWorkflow,
  enterDeckBuilding,
  openUnsavedChangesDialog,
  saveDeckWorkflow,
  shouldConfirmUnsavedChanges,
  updateDraftName,
  type DeckWorkflowContext
} from "../../../apps/web/src/deck/deckWorkflowService";
import { InMemoryDeckRepository, createGeneratedPersistenceError } from "../fakes/inMemoryDeckRepository";
import {
  maxSavedDecksArbitrary,
  savedDeckArbitrary
} from "../generators/deckGenerators";
import { NORMAL_CARD_IDS, validCatalogSnapshotFixture } from "../generators/catalogGenerators";
import fc from "fast-check";

function createContext(repository: InMemoryDeckRepository): DeckWorkflowContext {
  return {
    repository,
    catalog: validCatalogSnapshotFixture,
    now: () => "2026-07-25T00:00:00.000Z",
    createDeckId: () => "deck-generated"
  };
}

describe("deck workflow service", () => {
  it("opens the local data error flow when listing fails", async () => {
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      fail: { list: createGeneratedPersistenceError("deck.list") }
    });

    const result = await enterDeckBuilding(createContext(repository));

    expect(result.ok).toBe(false);
    expect(result.state.dialog.kind).toBe("local-data-error");
  });

  it("treats malformed list data as a local data error", async () => {
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      malformedList: true
    });

    const result = await enterDeckBuilding(createContext(repository));

    expect(result.ok).toBe(false);
    expect(result.state.dialog.kind).toBe("local-data-error");
  });

  it("opens the local data error flow when selected deck loading fails", async () => {
    const savedDeck = fc.sample(savedDeckArbitrary, { numRuns: 1 })[0];
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      initialDecks: [savedDeck],
      fail: { load: createGeneratedPersistenceError("deck.load") }
    });

    const result = await enterDeckBuilding(createContext(repository));

    expect(result.ok).toBe(false);
    expect(result.state.dialog.kind).toBe("local-data-error");
  });

  it("surfaces save failures without claiming success", async () => {
    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      fail: { save: createGeneratedPersistenceError("deck.save") }
    });
    const context = createContext(repository);
    const state = addDraftCard(context, createDeckWorkflowLoadingState(context), NORMAL_CARD_IDS[0]);

    const result = await saveDeckWorkflow(context, state);

    expect(result.ok).toBe(false);
    expect(result.state.dialog.kind).toBe("local-data-error");
    expect(repository.getSavedDeck("deck-generated")).toBeUndefined();
  });

  it("blocks the twentieth deck cap for new saves", async () => {
    await fc.assert(
      fc.asyncProperty(maxSavedDecksArbitrary, async (savedDecks) => {
        const repository = new InMemoryDeckRepository({
          catalog: validCatalogSnapshotFixture,
          initialDecks: savedDecks
        });
        const context = createContext(repository);
        const state = {
          ...createDeckWorkflowLoadingState(context),
          savedDecks: savedDecks.map((deck) => ({
            deckId: deck.deckId,
            name: deck.name,
            cardCount: 0,
            battleReady: false,
            updatedAt: deck.updatedAt
          })),
          loading: false
        };

        const result = await saveDeckWorkflow(context, state);

        expect(result.ok).toBe(false);
      }),
      { numRuns: 10 }
    );
  });

  it("handles delete failure and delete success", async () => {
    const savedDeck = fc.sample(savedDeckArbitrary, { numRuns: 1 })[0];
    const failingRepository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      initialDecks: [savedDeck],
      fail: { delete: createGeneratedPersistenceError("deck.delete") }
    });
    const failingContext = createContext(failingRepository);
    const entry = await enterDeckBuilding(failingContext);

    const failedDelete = await deleteSavedDeckWorkflow(failingContext, entry.state, savedDeck.deckId);
    expect(failedDelete.ok).toBe(false);
    expect(failedDelete.state.dialog.kind).toBe("local-data-error");

    const repository = new InMemoryDeckRepository({
      catalog: validCatalogSnapshotFixture,
      initialDecks: [savedDeck]
    });
    const context = createContext(repository);
    const loaded = await enterDeckBuilding(context);
    const deleted = await deleteSavedDeckWorkflow(context, loaded.state, savedDeck.deckId);

    expect(deleted.ok).toBe(true);
    expect(repository.getSavedDeck(savedDeck.deckId)).toBeUndefined();
  });

  it("opens unsaved navigation decisions only for dirty drafts", () => {
    const repository = new InMemoryDeckRepository({ catalog: validCatalogSnapshotFixture });
    const context = createContext(repository);
    const clean = createDeckWorkflowLoadingState(context);
    const dirty = updateDraftName(clean, "Changed Name");

    expect(shouldConfirmUnsavedChanges(clean)).toBe(false);
    expect(shouldConfirmUnsavedChanges(dirty)).toBe(true);
    expect(openUnsavedChangesDialog(dirty, { kind: "return-menu" }).dialog.kind).toBe("unsaved-changes");
  });
});
