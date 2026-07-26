import {
  buildStaticCatalogSnapshot,
  validateStaticCatalog,
  type StaticCatalogInput
} from "@ankake/domain";
import fc from "fast-check";
import cards from "../../../apps/web/public/data/cards.json";
import tokens from "../../../apps/web/public/data/tokens.json";
import version from "../../../apps/web/public/data/version.json";
import {
  deckBuildableTokenCatalogArbitrary,
  duplicateNormalCardIdCatalogArbitrary,
  invalidSpellStatsCatalogArbitrary,
  validCatalogInputArbitrary
} from "../generators/catalogGenerators";

describe("static catalog validation", () => {
  it("accepts the compiled UOW-001 static catalog", () => {
    const result = buildStaticCatalogSnapshot({
      cards,
      tokens,
      version
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.normalCardCount).toBe(60);
      expect(result.snapshot.tokenCount).toBe(2);
      expect(result.snapshot.cardsById.has("AK-001")).toBe(true);
      expect(result.snapshot.tokensById.has("AK-T-001")).toBe(true);
    }
  });

  it("rejects a catalog with the wrong normal card count", () => {
    const result = validateStaticCatalog({
      cards: (cards as unknown[]).slice(1),
      tokens
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "catalog.cards.count")).toBe(true);
    }
  });

  it("accepts generated valid catalog inputs", () => {
    fc.assert(
      fc.property(validCatalogInputArbitrary, (catalog) => {
        expect(validateStaticCatalog(catalog).ok).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("rejects generated duplicate normal card ids", () => {
    assertInvalidCatalogIncludes(duplicateNormalCardIdCatalogArbitrary, "catalog.id.duplicate");
  });

  it("rejects generated deck-buildable tokens", () => {
    assertInvalidCatalogIncludes(deckBuildableTokenCatalogArbitrary, "catalog.deck-buildable.invalid");
  });

  it("rejects generated spell records that define creature stats", () => {
    assertInvalidCatalogIncludes(invalidSpellStatsCatalogArbitrary, "catalog.spell.attack-forbidden");
  });
});

function assertInvalidCatalogIncludes(
  arbitrary: fc.Arbitrary<StaticCatalogInput>,
  expectedCode: string
): void {
  fc.assert(
    fc.property(arbitrary, (catalog) => {
      const result = validateStaticCatalog(catalog);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((issue) => issue.code === expectedCode)).toBe(true);
      }
    }),
    { numRuns: 40 }
  );
}
