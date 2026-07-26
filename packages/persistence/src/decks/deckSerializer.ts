import {
  createDraftFromSavedDeck,
  normalizeDeckCards,
  normalizeDeckName,
  validateDeckDraft,
  type SavedDeck,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import {
  ok,
  persistenceError,
  type PersistenceOperation,
  type RepositoryResult
} from "./repository";
import {
  isStoredDeckRecord,
  isStoredDeckRecordWithUnknownVersion,
  STORED_DECK_SCHEMA_VERSION,
  type StoredDeckRecord
} from "./storedDeckRecord";

export function serializeSavedDeck(savedDeck: SavedDeck): StoredDeckRecord {
  return {
    schemaVersion: STORED_DECK_SCHEMA_VERSION,
    deckId: savedDeck.deckId,
    name: normalizeDeckName(savedDeck.name),
    cards: normalizeDeckCards(savedDeck.cards),
    createdAt: savedDeck.createdAt,
    updatedAt: savedDeck.updatedAt
  };
}

export function deserializeStoredDeckRecord(
  record: unknown,
  catalog: StaticCatalogSnapshot,
  operation: PersistenceOperation = "deck.load"
): RepositoryResult<SavedDeck> {
  if (
    isStoredDeckRecordWithUnknownVersion(record) &&
    record.schemaVersion !== STORED_DECK_SCHEMA_VERSION
  ) {
    return persistenceError(
      operation,
      "deck.malformed-record",
      "Saved deck schema version is unsupported."
    );
  }

  if (!isStoredDeckRecord(record)) {
    return persistenceError(
      operation,
      "deck.malformed-record",
      "Saved deck record is malformed."
    );
  }

  const savedDeck: SavedDeck = {
    deckId: record.deckId,
    name: normalizeDeckName(record.name),
    cards: normalizeDeckCards(record.cards),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  const validation = validateDeckDraft(createDraftFromSavedDeck(savedDeck), catalog);

  if (!validation.saveable) {
    return persistenceError(
      operation,
      "deck.malformed-record",
      "Saved deck record failed deck validation."
    );
  }

  return ok(savedDeck);
}
