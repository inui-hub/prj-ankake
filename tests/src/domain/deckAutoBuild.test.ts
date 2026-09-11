import {
  AUTO_DECK_COST_TARGETS,
  CARD_ATTRIBUTES,
  DECK_MAX_CARD_COPIES,
  autoBuildDeckDraft,
  createNewDeckDraft,
  getDeckCardsWithRecords,
  getDeckTotalCount,
  type CardMasterRecord,
  type StaticCatalogSnapshot
} from "@ankake/domain";
import { validCatalogSnapshotFixture } from "../generators/catalogGenerators";

function balancedCatalog(): StaticCatalogSnapshot {
  const costs = [1, 2, 3, 5, 6, 8];
  const cards = validCatalogSnapshotFixture.cards.map((card, index) => ({
    ...card,
    attribute: CARD_ATTRIBUTES[Math.floor(index / 12)],
    cost: costs[index % costs.length]
  })) as readonly CardMasterRecord[];

  return {
    ...validCatalogSnapshotFixture,
    cards,
    cardsById: new Map(cards.map((card) => [card.id, card]))
  };
}

describe("automatic deck completion", () => {
  it("keeps existing cards and fills a legal forty-card deck", () => {
    const catalog = balancedCatalog();
    const draft = {
      ...createNewDeckDraft({ deckId: "existing-fire", now: "2026-07-25T00:00:00.000Z" }),
      cards: [{ cardId: "AK-001", count: 2 }]
    };

    const completed = autoBuildDeckDraft(draft, catalog);

    expect(getDeckTotalCount(completed.cards)).toBe(40);
    expect(completed.cards.find((entry) => entry.cardId === "AK-001")?.count).toBeGreaterThanOrEqual(2);
    expect(completed.cards.every((entry) => entry.count <= DECK_MAX_CARD_COPIES)).toBe(true);
    expect(completed.cards.every((entry) => catalog.cardsById.has(entry.cardId))).toBe(true);
    expect(getDeckCardsWithRecords(completed.cards, catalog).every(({ card }) => card.attribute === "fire")).toBe(true);
  });

  it("uses the 16 / 16 / 8 low, medium, and high cost target when possible", () => {
    const catalog = balancedCatalog();
    const draft = {
      ...createNewDeckDraft({ deckId: "cost-balanced", now: "2026-07-25T00:00:00.000Z" }),
      cards: [{ cardId: "AK-001", count: 1 }]
    };

    const completed = autoBuildDeckDraft(draft, catalog);
    const costBands = { low: 0, medium: 0, high: 0 };

    for (const { card, count } of getDeckCardsWithRecords(completed.cards, catalog)) {
      if (card.cost <= 4) costBands.low += count;
      else if (card.cost <= 7) costBands.medium += count;
      else costBands.high += count;
    }

    expect(costBands).toEqual(AUTO_DECK_COST_TARGETS);
  });

  it("adds token producers to support an existing light token payoff", () => {
    const catalog = balancedCatalog();
    const draft = {
      ...createNewDeckDraft({ deckId: "light-token", now: "2026-07-25T00:00:00.000Z" }),
      cards: [{ cardId: "AK-043", count: 1 }]
    };

    const completed = autoBuildDeckDraft(draft, catalog);
    const tokenProducers = new Set(["AK-038", "AK-042", "AK-044", "AK-046", "AK-048"]);

    expect(completed.cards.some((entry) => tokenProducers.has(entry.cardId))).toBe(true);
  });

  it("does not change a deck that already contains forty cards", () => {
    const catalog = balancedCatalog();
    const draft = {
      ...createNewDeckDraft({ deckId: "already-full", now: "2026-07-25T00:00:00.000Z" }),
      cards: catalog.cards.slice(0, 10).map((card) => ({ cardId: card.id, count: 4 }))
    };

    expect(autoBuildDeckDraft(draft, catalog)).toBe(draft);
  });
});
