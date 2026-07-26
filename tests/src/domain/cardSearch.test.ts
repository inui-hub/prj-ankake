import {
  searchDeckBuildableCards
} from "@ankake/domain";
import fc from "fast-check";
import {
  cardSearchCriteriaArbitrary,
  deckDraftArbitrary
} from "../generators/deckGenerators";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

describe("card search", () => {
  it("filters by query text", () => {
    const draft = fc.sample(deckDraftArbitrary, { numRuns: 1 })[0];
    const rows = searchDeckBuildableCards(validCatalogSnapshotFixture, draft, {
      query: "AK-001",
      type: "all",
      attribute: "all",
      cost: "all",
      sortKey: "name",
      sortDirection: "asc"
    });

    expect(rows.some((row) => row.card.id === "AK-001")).toBe(true);
  });

  it("returns deterministic deck-buildable subsets for identical criteria", () => {
    fc.assert(
      fc.property(deckDraftArbitrary, cardSearchCriteriaArbitrary, (draft, criteria) => {
        const first = searchDeckBuildableCards(validCatalogSnapshotFixture, draft, criteria);
        const second = searchDeckBuildableCards(validCatalogSnapshotFixture, draft, criteria);

        expect(first.map((row) => row.card.id)).toEqual(second.map((row) => row.card.id));
        expect(first.every((row) => row.card.deckBuildable)).toBe(true);
        expect(first.every((row) => !validCatalogSnapshotFixture.tokensById.has(row.card.id))).toBe(true);
      }),
      { numRuns: 80 }
    );
  });
});
