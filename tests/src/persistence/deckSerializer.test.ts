import {
  deserializeStoredDeckRecord,
  serializeSavedDeck
} from "@ankake/persistence";
import fc from "fast-check";
import {
  malformedStoredDeckRecordArbitrary,
  savedDeckArbitrary
} from "../generators/deckGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("deck serializer", () => {
  it("round-trips valid saved decks deterministically", () => {
    fc.assert(
      fc.property(savedDeckArbitrary, (savedDeck) => {
        const stored = serializeSavedDeck(savedDeck);
        const restored = deserializeStoredDeckRecord(stored, validCatalogSnapshotFixture);

        expect(restored.ok).toBe(true);
        if (restored.ok) {
          expect(restored.value).toEqual({
            ...savedDeck,
            cards: stored.cards
          });
        }
      }),
      { numRuns: 80 }
    );
  });

  it("rejects malformed or unsupported records", () => {
    fc.assert(
      fc.property(malformedStoredDeckRecordArbitrary, (record) => {
        const restored = deserializeStoredDeckRecord(record, validCatalogSnapshotFixture);

        expect(restored.ok).toBe(false);
      }),
      { numRuns: 60 }
    );
  });
});
