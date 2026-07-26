import {
  type StaticCatalogBuildResult,
  type StaticCatalogInput,
  type StaticCatalogSnapshot
} from "./types";
import { validateStaticCatalog } from "./validation";

export function buildStaticCatalogSnapshot(input: StaticCatalogInput): StaticCatalogBuildResult {
  const validation = validateStaticCatalog(input);

  if (!validation.ok) {
    return {
      ok: false,
      issues: validation.issues
    };
  }

  const snapshot: StaticCatalogSnapshot = {
    cards: validation.cards,
    tokens: validation.tokens,
    version: input.version,
    cardsById: new Map(validation.cards.map((card) => [card.id, card])),
    tokensById: new Map(validation.tokens.map((token) => [token.id, token])),
    normalCardCount: validation.cards.length,
    tokenCount: validation.tokens.length
  };

  return {
    ok: true,
    snapshot
  };
}
