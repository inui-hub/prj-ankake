import {
  CARD_ATTRIBUTES,
  type CardAttribute,
  type CardMasterRecord,
  type CardType,
  type StaticCatalogSnapshot
} from "../catalog/types";
import {
  DECK_BATTLE_READY_CARD_COUNT,
  DECK_MAX_CARD_COPIES,
  type CardId,
  type DeckCardCount,
  type DeckDraft
} from "./types";
import { getCardCount, getDeckCardsWithRecords, getDeckTotalCount, normalizeDeckCards } from "./operations";

export const AUTO_DECK_COST_TARGETS = {
  low: 16,
  medium: 16,
  high: 8
} as const;

const AUTO_DECK_TYPE_TARGETS: Readonly<Record<CardType, number>> = {
  creature: 28,
  spell: 12
};

type AutoDeckCostBand = keyof typeof AUTO_DECK_COST_TARGETS;
type AutoDeckRole = "token-producer" | "token-payoff" | "graveyard-fuel" | "graveyard-payoff" | "ramp" | "ramp-payoff" | "creature-support" | "movement";

interface AutoDeckProfile {
  readonly attributes: readonly CardAttribute[];
  readonly preferredRoles: readonly AutoDeckRole[];
}

/**
 * Completes a draft without replacing a player's choices.  Selection is
 * deterministic for a given draft and catalog: only the empty-draft profile
 * is varied by the draft ID, and every card choice is scored rather than
 * sampled at random.
 */
export function autoBuildDeckDraft(
  draft: DeckDraft,
  catalog: StaticCatalogSnapshot
): DeckDraft {
  if (getDeckTotalCount(draft.cards) >= DECK_BATTLE_READY_CARD_COUNT) {
    return draft;
  }

  const profile = selectAutoDeckProfile(draft, catalog);
  let cards = normalizeDeckCards(draft.cards);
  let added = false;

  while (getDeckTotalCount(cards) < DECK_BATTLE_READY_CARD_COUNT) {
    const candidate = selectBestCandidate(cards, catalog, profile);

    if (!candidate) {
      break;
    }

    cards = addOneCard(cards, candidate.id);
    added = true;
  }

  return !added
    ? draft
    : {
        ...draft,
        cards
      };
}

export function getAutoDeckCostBand(cost: number): AutoDeckCostBand {
  if (cost <= 4) return "low";
  if (cost <= 7) return "medium";
  return "high";
}

function selectAutoDeckProfile(
  draft: DeckDraft,
  catalog: StaticCatalogSnapshot
): AutoDeckProfile {
  const attributeCounts = getAttributeCounts(draft.cards, catalog);
  const presentAttributes = CARD_ATTRIBUTES.filter((attribute) => attributeCounts[attribute] > 0);

  if (presentAttributes.length === 0) {
    return EMPTY_DRAFT_PROFILES[hashString(draft.deckId) % EMPTY_DRAFT_PROFILES.length];
  }

  const attributes = [...presentAttributes]
    .sort((left, right) => attributeCounts[right] - attributeCounts[left] || left.localeCompare(right))
    .slice(0, 2);

  return {
    attributes,
    preferredRoles: attributes.flatMap((attribute) => ATTRIBUTE_PREFERRED_ROLES[attribute])
  };
}

function selectBestCandidate(
  cards: readonly DeckCardCount[],
  catalog: StaticCatalogSnapshot,
  profile: AutoDeckProfile
): CardMasterRecord | undefined {
  const current = createDeckComposition(cards, catalog);
  const targetAttributeCount = Math.ceil(DECK_BATTLE_READY_CARD_COUNT / profile.attributes.length);

  return catalog.cards
    .filter((card) => card.deckBuildable)
    .filter((card) => profile.attributes.includes(card.attribute))
    .filter((card) => getCardCount(cards, card.id) < DECK_MAX_CARD_COPIES)
    .sort((left, right) => {
      const difference = scoreCard(right, current, profile, targetAttributeCount) - scoreCard(left, current, profile, targetAttributeCount);
      return difference || left.id.localeCompare(right.id, "en");
    })[0];
}

function scoreCard(
  card: CardMasterRecord,
  current: DeckComposition,
  profile: AutoDeckProfile,
  targetAttributeCount: number
): number {
  const costBand = getAutoDeckCostBand(card.cost);
  const costGap = AUTO_DECK_COST_TARGETS[costBand] - current.costBands[costBand];
  const typeGap = AUTO_DECK_TYPE_TARGETS[card.type] - current.types[card.type];
  const attributeGap = targetAttributeCount - current.attributes[card.attribute];
  const roles = AUTO_DECK_CARD_ROLES[card.id] ?? [];

  // Cost bands take precedence.  This reaches 16 / 16 / 8 wherever the
  // selected attributes have legal copies available.
  let score = costGap > 0 ? 10_000 + costGap * 100 : costGap * 100;
  score += Math.max(typeGap, 0) * 20;
  score += Math.max(attributeGap, 0) * 15;
  score -= current.cardCounts.get(card.id) ?? 0;

  for (const role of roles) {
    if (profile.preferredRoles.includes(role)) score += 30;
    score += getRoleSynergyScore(role, current.roles);
  }

  return score;
}

function addOneCard(cards: readonly DeckCardCount[], cardId: CardId): readonly DeckCardCount[] {
  const current = getCardCount(cards, cardId);
  return normalizeDeckCards(
    current === 0
      ? [...cards, { cardId, count: 1 }]
      : cards.map((entry) => entry.cardId === cardId ? { ...entry, count: entry.count + 1 } : entry)
  );
}

interface DeckComposition {
  readonly costBands: Record<AutoDeckCostBand, number>;
  readonly types: Record<CardType, number>;
  readonly attributes: Record<CardAttribute, number>;
  readonly cardCounts: ReadonlyMap<CardId, number>;
  readonly roles: ReadonlyMap<AutoDeckRole, number>;
}

function createDeckComposition(
  cards: readonly DeckCardCount[],
  catalog: StaticCatalogSnapshot
): DeckComposition {
  const costBands: Record<AutoDeckCostBand, number> = { low: 0, medium: 0, high: 0 };
  const types: Record<CardType, number> = { creature: 0, spell: 0 };
  const attributes: Record<CardAttribute, number> = { fire: 0, water: 0, wind: 0, light: 0, dark: 0 };
  const roles = new Map<AutoDeckRole, number>();

  for (const { card, count } of getDeckCardsWithRecords(cards, catalog)) {
    costBands[getAutoDeckCostBand(card.cost)] += count;
    types[card.type] += count;
    attributes[card.attribute] += count;
    for (const role of AUTO_DECK_CARD_ROLES[card.id] ?? []) {
      roles.set(role, (roles.get(role) ?? 0) + count);
    }
  }

  return {
    costBands,
    types,
    attributes,
    cardCounts: new Map(cards.map((entry) => [entry.cardId, entry.count])),
    roles
  };
}

function getAttributeCounts(
  cards: readonly DeckCardCount[],
  catalog: StaticCatalogSnapshot
): Record<CardAttribute, number> {
  return createDeckComposition(cards, catalog).attributes;
}

function getRoleSynergyScore(
  role: AutoDeckRole,
  roles: ReadonlyMap<AutoDeckRole, number>
): number {
  const pairs: Readonly<Record<AutoDeckRole, AutoDeckRole | undefined>> = {
    "token-producer": "token-payoff",
    "token-payoff": "token-producer",
    "graveyard-fuel": "graveyard-payoff",
    "graveyard-payoff": "graveyard-fuel",
    ramp: "ramp-payoff",
    "ramp-payoff": "ramp",
    "creature-support": undefined,
    movement: undefined
  };
  return (roles.get(pairs[role] ?? role) ?? 0) * (pairs[role] ? 12 : 0);
}

function hashString(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

const ATTRIBUTE_PREFERRED_ROLES: Readonly<Record<CardAttribute, readonly AutoDeckRole[]>> = {
  fire: ["creature-support"],
  water: ["movement"],
  wind: ["ramp", "ramp-payoff"],
  light: ["token-producer", "token-payoff"],
  dark: ["graveyard-fuel", "graveyard-payoff"]
};

const EMPTY_DRAFT_PROFILES: readonly AutoDeckProfile[] = [
  { attributes: ["fire"], preferredRoles: ATTRIBUTE_PREFERRED_ROLES.fire },
  { attributes: ["water"], preferredRoles: ATTRIBUTE_PREFERRED_ROLES.water },
  { attributes: ["wind"], preferredRoles: ATTRIBUTE_PREFERRED_ROLES.wind },
  { attributes: ["light"], preferredRoles: ATTRIBUTE_PREFERRED_ROLES.light },
  { attributes: ["dark"], preferredRoles: ATTRIBUTE_PREFERRED_ROLES.dark },
  { attributes: ["fire", "water"], preferredRoles: [...ATTRIBUTE_PREFERRED_ROLES.fire, ...ATTRIBUTE_PREFERRED_ROLES.water] },
  { attributes: ["wind", "light"], preferredRoles: [...ATTRIBUTE_PREFERRED_ROLES.wind, ...ATTRIBUTE_PREFERRED_ROLES.light] },
  { attributes: ["light", "dark"], preferredRoles: [...ATTRIBUTE_PREFERRED_ROLES.light, ...ATTRIBUTE_PREFERRED_ROLES.dark] },
  { attributes: ["fire", "dark"], preferredRoles: [...ATTRIBUTE_PREFERRED_ROLES.fire, ...ATTRIBUTE_PREFERRED_ROLES.dark] },
  { attributes: ["water", "wind"], preferredRoles: [...ATTRIBUTE_PREFERRED_ROLES.water, ...ATTRIBUTE_PREFERRED_ROLES.wind] }
];

/** Known card roles from the canonical card list; this keeps synergies explicit and reviewable. */
const AUTO_DECK_CARD_ROLES: Readonly<Record<string, readonly AutoDeckRole[]>> = {
  "AK-004": ["creature-support"], "AK-006": ["creature-support"], "AK-008": ["creature-support"], "AK-009": ["creature-support"],
  "AK-013": ["movement"], "AK-015": ["movement"], "AK-018": ["movement"], "AK-019": ["movement"], "AK-021": ["movement"], "AK-022": ["movement"],
  "AK-025": ["ramp-payoff"], "AK-027": ["ramp"], "AK-029": ["ramp"], "AK-030": ["ramp-payoff"], "AK-031": ["ramp-payoff"], "AK-032": ["ramp-payoff"], "AK-034": ["ramp-payoff"], "AK-035": ["ramp-payoff"], "AK-036": ["ramp-payoff"],
  "AK-038": ["token-producer"], "AK-042": ["token-producer"], "AK-043": ["token-payoff"], "AK-044": ["token-producer", "token-payoff"], "AK-046": ["token-producer", "token-payoff"], "AK-048": ["token-producer", "token-payoff"],
  "AK-049": ["graveyard-fuel"], "AK-051": ["graveyard-fuel"], "AK-052": ["graveyard-fuel"], "AK-054": ["graveyard-payoff"], "AK-056": ["graveyard-payoff"], "AK-057": ["graveyard-payoff"], "AK-058": ["graveyard-payoff"], "AK-059": ["graveyard-payoff"]
};
