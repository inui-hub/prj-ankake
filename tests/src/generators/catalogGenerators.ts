import {
  CARD_ATTRIBUTES,
  buildStaticCatalogSnapshot,
  type CardAttribute,
  type CardMasterRecord,
  type StaticCatalogInput,
  type StaticCatalogSnapshot,
  type TokenMasterRecord,
  type VersionMetadata
} from "@ankake/domain";
import fc from "fast-check";

export const NORMAL_CARD_IDS = Array.from({ length: 60 }, (_, index) => `AK-${String(index + 1).padStart(3, "0")}`);
export const TOKEN_IDS = ["AK-T-001", "AK-T-002"] as const;

const validNameArbitrary: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 32 })
  .map((name) => name.trim() || "Generated Card");

export const catalogVersionFixture: VersionMetadata = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.1.0",
  appVersion: "0.1.0",
  generatedAt: "2026-07-25T17:23:57Z",
  sourceDocuments: ["docs/project_ankake_all_cards_v1_1.md"]
};

export const validCardTemplateArbitrary: fc.Arbitrary<Omit<CardMasterRecord, "id" | "illustration">> = fc.oneof(
  fc
    .record({
      name: validNameArbitrary,
      attribute: fc.constantFrom(...CARD_ATTRIBUTES) as fc.Arbitrary<CardAttribute>,
      cost: fc.integer({ min: 1, max: 10 }),
      attack: fc.integer({ min: 1, max: 12 }),
      health: fc.integer({ min: 1, max: 12 })
    })
    .map((record) => ({
      ...record,
      type: "creature" as const,
      deckBuildable: true as const,
      effectText: "No effect.",
      effectIds: []
    })),
  fc
    .record({
      name: validNameArbitrary,
      attribute: fc.constantFrom(...CARD_ATTRIBUTES) as fc.Arbitrary<CardAttribute>,
      cost: fc.integer({ min: 1, max: 10 })
    })
    .map((record) => ({
      ...record,
      type: "spell" as const,
      deckBuildable: true as const,
      effectText: "No effect.",
      effectIds: []
    }))
);

export const validTokenTemplateArbitrary: fc.Arbitrary<Omit<TokenMasterRecord, "id" | "illustration">> = fc
  .record({
    name: validNameArbitrary,
    attribute: fc.constantFrom("light", "dark") as fc.Arbitrary<CardAttribute>,
    attack: fc.integer({ min: 1, max: 3 }),
    health: fc.integer({ min: 1, max: 3 }),
    generatedBy: fc.constantFrom("light-card-effect", "dark-card-effect-or-resonance")
  })
  .map((record) => ({
    ...record,
    type: "creature-token" as const,
    cost: 1,
    deckBuildable: false as const,
    effectText: "No effect.",
    effectIds: []
  }));

export const validCatalogInputArbitrary: fc.Arbitrary<StaticCatalogInput> = fc
  .tuple(
    fc.array(validCardTemplateArbitrary, { minLength: NORMAL_CARD_IDS.length, maxLength: NORMAL_CARD_IDS.length }),
    fc.array(validTokenTemplateArbitrary, { minLength: TOKEN_IDS.length, maxLength: TOKEN_IDS.length })
  )
  .map(([cards, tokens]) => ({
    cards: cards.map((card, index) => ({
      ...card,
      id: NORMAL_CARD_IDS[index],
      illustration: illustrationFor(NORMAL_CARD_IDS[index])
    })),
    tokens: tokens.map((token, index) => ({
      ...token,
      id: TOKEN_IDS[index],
      illustration: illustrationFor(TOKEN_IDS[index])
    })),
    version: catalogVersionFixture
  }));

export const duplicateNormalCardIdCatalogArbitrary: fc.Arbitrary<StaticCatalogInput> = validCatalogInputArbitrary.map((catalog) => {
  const cards = catalog.cards as CardMasterRecord[];
  return {
    ...catalog,
    cards: cards.map((card, index) => (index === 1 ? { ...card, id: cards[0].id } : card))
  };
});

export const deckBuildableTokenCatalogArbitrary: fc.Arbitrary<StaticCatalogInput> = validCatalogInputArbitrary.map((catalog) => {
  const tokens = catalog.tokens as TokenMasterRecord[];
  return {
    ...catalog,
    tokens: tokens.map((token, index) => (index === 0 ? { ...token, deckBuildable: true } : token))
  };
});

export const invalidSpellStatsCatalogArbitrary: fc.Arbitrary<StaticCatalogInput> = validCatalogInputArbitrary.map((catalog) => {
  const cards = catalog.cards as CardMasterRecord[];
  return {
    ...catalog,
    cards: cards.map((card, index) =>
      index === 0
        ? {
            id: card.id,
            name: card.name,
            attribute: card.attribute,
            type: "spell",
            cost: card.cost,
            attack: 1,
            health: 1,
            deckBuildable: true,
            effectText: "No effect.",
            effectIds: [],
            illustration: card.illustration
          }
        : card
    )
  };
});

export const validCatalogFixture: StaticCatalogInput = fc.sample(validCatalogInputArbitrary, { numRuns: 1 })[0];

export const validCatalogSnapshotFixture: StaticCatalogSnapshot = (() => {
  const result = buildStaticCatalogSnapshot(validCatalogFixture);
  if (!result.ok) {
    throw new Error("Catalog generator produced an invalid fixture.");
  }
  return result.snapshot;
})();

export function illustrationFor(id: string): string {
  return `images/card_illustrations/project_ankake_card_illustration_${id}_v1_0.png`;
}
