import {
  createSavedDeckSummary,
  type DeckId,
  type SavedDeck,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import {
  deserializeStoredDeckRecord,
  serializeSavedDeck
} from "./deckSerializer";
import {
  ok,
  persistenceError,
  type DeckRepository,
  type PersistenceOperation,
  type RepositoryResult
} from "./repository";
import type { StoredDeckRecord } from "./storedDeckRecord";

export const DEFAULT_DECK_DATABASE_NAME = "ankake-local-decks";
export const DEFAULT_DECK_STORE_NAME = "decks";
export const DEFAULT_DECK_DATABASE_VERSION = 1;

export interface IndexedDbDeckRepositoryOptions {
  readonly catalog: StaticCatalogSnapshot;
  readonly indexedDb?: IDBFactory;
  readonly databaseName?: string;
  readonly storeName?: string;
}

export class IndexedDbDeckRepository implements DeckRepository {
  private readonly catalog: StaticCatalogSnapshot;
  private readonly indexedDb?: IDBFactory;
  private readonly databaseName: string;
  private readonly storeName: string;

  constructor(options: IndexedDbDeckRepositoryOptions) {
    this.catalog = options.catalog;
    this.indexedDb = options.indexedDb ?? globalThis.indexedDB;
    this.databaseName = options.databaseName ?? DEFAULT_DECK_DATABASE_NAME;
    this.storeName = options.storeName ?? DEFAULT_DECK_STORE_NAME;
  }

  async listDecks(): Promise<RepositoryResult<readonly ReturnType<typeof createSavedDeckSummary>[]>> {
    const databaseResult = await this.openDatabase("deck.list");

    if (!databaseResult.ok) {
      return databaseResult;
    }

    const database = databaseResult.value;

    try {
      const transaction = database.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const records = await requestToPromise<StoredDeckRecord[]>(store.getAll());
      await transactionDone(transaction);
      const savedDecks: SavedDeck[] = [];

      for (const record of records) {
        const result = deserializeStoredDeckRecord(record, this.catalog, "deck.list");

        if (!result.ok) {
          return result;
        }

        savedDecks.push(result.value);
      }

      const summaries = savedDecks
        .map((savedDeck) => createSavedDeckSummary(savedDeck, this.catalog))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return ok(summaries);
    } catch (cause) {
      return persistenceError(
        "deck.list",
        "storage.read-failed",
        "Unable to list saved decks.",
        cause
      );
    } finally {
      database.close();
    }
  }

  async loadDeck(deckId: DeckId): Promise<RepositoryResult<SavedDeck>> {
    const databaseResult = await this.openDatabase("deck.load");

    if (!databaseResult.ok) {
      return databaseResult;
    }

    const database = databaseResult.value;

    try {
      const transaction = database.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const record = await requestToPromise<StoredDeckRecord | undefined>(store.get(deckId));
      await transactionDone(transaction);

      if (!record) {
        return persistenceError(
          "deck.load",
          "deck.not-found",
          "Saved deck was not found."
        );
      }

      return deserializeStoredDeckRecord(record, this.catalog, "deck.load");
    } catch (cause) {
      return persistenceError(
        "deck.load",
        "storage.read-failed",
        "Unable to load saved deck.",
        cause
      );
    } finally {
      database.close();
    }
  }

  async saveDeck(savedDeck: SavedDeck): Promise<RepositoryResult<SavedDeck>> {
    const databaseResult = await this.openDatabase("deck.save");

    if (!databaseResult.ok) {
      return databaseResult;
    }

    const database = databaseResult.value;

    try {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      await requestToPromise(store.put(serializeSavedDeck(savedDeck)));
      await transactionDone(transaction);
      return ok(savedDeck);
    } catch (cause) {
      return persistenceError(
        "deck.save",
        "storage.write-failed",
        "Unable to save deck.",
        cause
      );
    } finally {
      database.close();
    }
  }

  async deleteDeck(deckId: DeckId): Promise<RepositoryResult<void>> {
    const databaseResult = await this.openDatabase("deck.delete");

    if (!databaseResult.ok) {
      return databaseResult;
    }

    const database = databaseResult.value;

    try {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      await requestToPromise(store.delete(deckId));
      await transactionDone(transaction);
      return ok(undefined);
    } catch (cause) {
      return persistenceError(
        "deck.delete",
        "storage.delete-failed",
        "Unable to delete saved deck.",
        cause
      );
    } finally {
      database.close();
    }
  }

  private async openDatabase(operation: PersistenceOperation): Promise<RepositoryResult<IDBDatabase>> {
    if (!this.indexedDb) {
      return persistenceError(
        operation,
        "storage.unavailable",
        "IndexedDB is unavailable in this browser."
      );
    }

    try {
      const request = this.indexedDb.open(
        this.databaseName,
        DEFAULT_DECK_DATABASE_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, {
            keyPath: "deckId"
          });
        }
      };

      const database = await requestToPromise(request);
      return ok(database);
    } catch (cause) {
      return persistenceError(
        operation,
        "storage.open-failed",
        "Unable to open local deck storage.",
        cause
      );
    }
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
