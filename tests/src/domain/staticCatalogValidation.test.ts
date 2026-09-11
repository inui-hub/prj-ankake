import {
  buildStaticCatalogSnapshot,
  CANONICAL_EFFECT_MANIFEST,
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
    const result = buildStaticCatalogSnapshot(canonicalCatalogInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.normalCardCount).toBe(60);
      expect(result.snapshot.tokenCount).toBe(2);
      expect(result.snapshot.cardsById.has("AK-001")).toBe(true);
      expect(result.snapshot.tokensById.has("AK-T-001")).toBe(true);
    }
  });

  it("builds an immutable lookup for all 62 canonical effect entries", () => {
    const entriesById = new Map(CANONICAL_EFFECT_MANIFEST.map((entry) => [entry.cardId, entry]));
    const applyManifest = (record: Record<string, unknown>) => {
      const entry = entriesById.get(record.id as string)!;
      return {
        ...record,
        effectText: entry.effects === "none" ? "なし" : entry.effects[0].operations[0].text,
        effectIds: entry.effects === "none" ? [] : entry.effects.map((definition) => definition.effectId)
      };
    };
    const result = buildStaticCatalogSnapshot({
      cards: (cards as Record<string, unknown>[]).map(applyManifest),
      tokens: (tokens as Record<string, unknown>[]).map(applyManifest),
      version,
      effectManifest: CANONICAL_EFFECT_MANIFEST
    });

    expect(CANONICAL_EFFECT_MANIFEST).toHaveLength(62);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.effectsByCardId.size).toBe(62);
      expect(result.snapshot.effectsByCardId.get("AK-001")).toBe("none");
      const effect = result.snapshot.effectsByCardId.get("AK-002");
      expect(effect === "none" ? undefined : effect?.[0]?.effectId).toBe("AK-002.primary");
    }
  });

  it("rejects placeholder text when validating a manifest", () => {
    const result = buildStaticCatalogSnapshot({ cards, tokens, version, effectManifest: CANONICAL_EFFECT_MANIFEST });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((issue) => issue.code === "catalog.effect-manifest.placeholder")).toBe(true);
  });

  it("rejects duplicate IDs and malformed nested manifest definitions", () => {
    const input = canonicalCatalogInput();
    const duplicate = [...CANONICAL_EFFECT_MANIFEST, CANONICAL_EFFECT_MANIFEST[0]!];
    const duplicateResult = buildStaticCatalogSnapshot({ ...input, effectManifest: duplicate });
    expect(duplicateResult.ok).toBe(false);
    if (!duplicateResult.ok) expect(duplicateResult.issues.some((issue) => issue.code === "catalog.effect-manifest.duplicate-card")).toBe(true);

    const malformed = CANONICAL_EFFECT_MANIFEST.map((entry, index) => index === 1
      ? { ...entry, effects: [{ effectId: "AK-002.primary", trigger: "play", target: "documented", operations: [] }] }
      : entry);
    const malformedResult = buildStaticCatalogSnapshot({ ...input, effectManifest: malformed });
    expect(malformedResult.ok).toBe(false);
    if (!malformedResult.ok) expect(malformedResult.issues.some((issue) => issue.code === "catalog.effect-manifest.definition-missing")).toBe(true);
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

function canonicalCatalogInput() {
  const entriesById = new Map(CANONICAL_EFFECT_MANIFEST.map((entry) => [entry.cardId, entry]));
  const applyManifest = (record: Record<string, unknown>) => {
    const entry = entriesById.get(record.id as string)!;
    return { ...record, effectText: entry.effects === "none" ? "なし" : entry.effects[0]!.operations[0]!.text, effectIds: entry.effects === "none" ? [] : entry.effects.map((definition) => definition.effectId) };
  };
  return { cards: (cards as Record<string, unknown>[]).map(applyManifest), tokens: (tokens as Record<string, unknown>[]).map(applyManifest), version, effectManifest: CANONICAL_EFFECT_MANIFEST };
}

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
