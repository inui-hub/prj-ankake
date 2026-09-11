import {
  createSavedDeckSummary,
  type DeckId,
  type SavedDeck,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import {
  ok,
  persistenceError,
  type DeckRepository,
  type PersistenceError,
  type RepositoryResult
} from "@ankake/persistence";

export type InMemoryDeckRepositoryFailureKey = "list" | "load" | "save" | "delete";

export interface InMemoryDeckRepositoryOptions {
  readonly catalog: StaticCatalogSnapshot;
  readonly initialDecks?: readonly SavedDeck[];
  readonly fail?: Partial<Record<InMemoryDeckRepositoryFailureKey, PersistenceError>>;
  readonly malformedList?: boolean;
}

export class InMemoryDeckRepository implements DeckRepository {
  private readonly catalog: StaticCatalogSnapshot;
  private readonly decks = new Map<DeckId, SavedDeck>();
  private readonly fail: Partial<Record<InMemoryDeckRepositoryFailureKey, PersistenceError>>;
  private readonly malformedList: boolean;

  constructor(options: InMemoryDeckRepositoryOptions) {
    this.catalog = options.catalog;
    this.fail = options.fail ?? {};
    this.malformedList = options.malformedList ?? false;

    for (const deck of options.initialDecks ?? []) {
      this.decks.set(deck.deckId, deck);
    }
  }

  async listDecks() {
    if (this.fail.list) {
      return { ok: false, error: this.fail.list } satisfies RepositoryResult<never>;
    }

    if (this.malformedList) {
      return persistenceError(
        "deck.list",
        "deck.malformed-record",
        "Generated malformed deck list."
      );
    }

    const summaries = [...this.decks.values()]
      .map((deck) => createSavedDeckSummary(deck, this.catalog))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return ok(summaries);
  }

  async loadDeck(deckId: DeckId) {
    if (this.fail.load) {
      return { ok: false, error: this.fail.load } satisfies RepositoryResult<never>;
    }

    const deck = this.decks.get(deckId);

    if (!deck) {
      return persistenceError("deck.load", "deck.not-found", "Generated deck not found.");
    }

    return ok(deck);
  }

  async saveDeck(savedDeck: SavedDeck) {
    if (this.fail.save) {
      return { ok: false, error: this.fail.save } satisfies RepositoryResult<never>;
    }

    this.decks.set(savedDeck.deckId, savedDeck);
    return ok(savedDeck);
  }

  async deleteDeck(deckId: DeckId) {
    if (this.fail.delete) {
      return { ok: false, error: this.fail.delete } satisfies RepositoryResult<never>;
    }

    this.decks.delete(deckId);
    return ok(undefined);
  }

  getSavedDeck(deckId: DeckId): SavedDeck | undefined {
    return this.decks.get(deckId);
  }
}

export function createGeneratedPersistenceError(
  operation: PersistenceError["operation"]
): PersistenceError {
  return {
    operation,
    code: "storage.read-failed",
    message: `Generated failure for ${operation}.`
  };
}
