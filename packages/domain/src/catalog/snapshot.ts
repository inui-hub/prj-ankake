import {
  type StaticCatalogBuildResult,
  type StaticCatalogInput,
  type StaticCatalogSnapshot
} from "./types";
import { validateEffectManifest, validateStaticCatalog } from "./validation";

export function buildStaticCatalogSnapshot(input: StaticCatalogInput): StaticCatalogBuildResult {
  const validation = validateStaticCatalog(input);

  if (!validation.ok) {
    return {
      ok: false,
      issues: validation.issues
    };
  }
  const manifestIssues = validateEffectManifest(input.effectManifest, [...validation.cards, ...validation.tokens]);
  if (manifestIssues.length > 0) return { ok: false, issues: manifestIssues };
  const effectsByCardId = new Map(
    (input.effectManifest as import("./types").EffectManifest).map((entry) => [entry.cardId, entry.effects] as const)
  );

  const snapshot: StaticCatalogSnapshot = {
    cards: validation.cards,
    tokens: validation.tokens,
    version: input.version,
    cardsById: new Map(validation.cards.map((card) => [card.id, card])),
    tokensById: new Map(validation.tokens.map((token) => [token.id, token])),
    effectsByCardId,
    normalCardCount: validation.cards.length,
    tokenCount: validation.tokens.length
  };

  return {
    ok: true,
    snapshot
  };
}
