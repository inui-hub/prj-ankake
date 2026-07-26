export const STORED_DECK_SCHEMA_VERSION = "ankake.deck.v1";

export interface StoredDeckCardCount {
  readonly cardId: string;
  readonly count: number;
}

export interface StoredDeckRecord {
  readonly schemaVersion: typeof STORED_DECK_SCHEMA_VERSION;
  readonly deckId: string;
  readonly name: string;
  readonly cards: readonly StoredDeckCardCount[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isStoredDeckRecord(value: unknown): value is StoredDeckRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === STORED_DECK_SCHEMA_VERSION &&
    typeof value.deckId === "string" &&
    value.deckId.length > 0 &&
    typeof value.name === "string" &&
    Array.isArray(value.cards) &&
    value.cards.every(isStoredDeckCardCount) &&
    typeof value.createdAt === "string" &&
    value.createdAt.length > 0 &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

export function isStoredDeckRecordWithUnknownVersion(value: unknown): value is {
  readonly schemaVersion: unknown;
} {
  return isRecord(value) && "schemaVersion" in value;
}

function isStoredDeckCardCount(value: unknown): value is StoredDeckCardCount {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.cardId === "string" &&
    value.cardId.length > 0 &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
