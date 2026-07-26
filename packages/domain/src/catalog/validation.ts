import {
  CARD_ATTRIBUTES,
  CARD_TYPES,
  TOKEN_TYPES,
  type CardMasterRecord,
  type StaticCatalogInput,
  type StaticCatalogValidationIssue,
  type StaticCatalogValidationResult,
  type TokenMasterRecord
} from "./types";

const EXPECTED_NORMAL_CARD_COUNT = 60;
const EXPECTED_TOKEN_COUNT = 2;
const MIN_COST = 1;
const MAX_COST = 10;

type JsonRecord = Record<string, unknown>;

export function validateStaticCatalog(input: Pick<StaticCatalogInput, "cards" | "tokens">): StaticCatalogValidationResult {
  const issues: StaticCatalogValidationIssue[] = [];

  const cards = Array.isArray(input.cards) ? input.cards : [];
  const tokens = Array.isArray(input.tokens) ? input.tokens : [];

  if (!Array.isArray(input.cards)) {
    issues.push(issue("catalog.cards.not-array", "cards", "Normal card catalog must be an array."));
  } else if (cards.length !== EXPECTED_NORMAL_CARD_COUNT) {
    issues.push(issue("catalog.cards.count", "cards", `Expected ${EXPECTED_NORMAL_CARD_COUNT} normal cards.`));
  }

  if (!Array.isArray(input.tokens)) {
    issues.push(issue("catalog.tokens.not-array", "tokens", "Token catalog must be an array."));
  } else if (tokens.length !== EXPECTED_TOKEN_COUNT) {
    issues.push(issue("catalog.tokens.count", "tokens", `Expected ${EXPECTED_TOKEN_COUNT} tokens.`));
  }

  validateRecords(cards, "cards", "normal", issues);
  validateRecords(tokens, "tokens", "token", issues);

  return issues.length === 0
    ? {
        ok: true,
        cards: cards as readonly CardMasterRecord[],
        tokens: tokens as readonly TokenMasterRecord[]
      }
    : { ok: false, issues };
}

function validateRecords(
  records: readonly unknown[],
  collectionPath: "cards" | "tokens",
  expectedKind: "normal" | "token",
  issues: StaticCatalogValidationIssue[]
): void {
  const ids = new Map<string, number>();

  records.forEach((candidate, index) => {
    const path = `${collectionPath}[${index}]`;

    if (!isRecord(candidate)) {
      issues.push(issue("catalog.record.not-object", path, "Catalog record must be an object."));
      return;
    }

    const id = readString(candidate.id);
    if (!id) {
      issues.push(issue("catalog.id.required", `${path}.id`, "Catalog record id is required."));
    } else {
      const previousIndex = ids.get(id);
      if (previousIndex !== undefined) {
        issues.push(issue("catalog.id.duplicate", `${path}.id`, `Duplicate id ${id}; first seen at ${collectionPath}[${previousIndex}].`));
      }
      ids.set(id, index);
    }

    if (!readString(candidate.name)) {
      issues.push(issue("catalog.name.required", `${path}.name`, "Catalog record name is required."));
    }

    if (!CARD_ATTRIBUTES.includes(candidate.attribute as never)) {
      issues.push(issue("catalog.attribute.invalid", `${path}.attribute`, "Catalog record attribute is invalid."));
    }

    validateCost(candidate.cost, `${path}.cost`, issues);
    validateEffectFields(candidate, path, issues);
    validateIllustration(candidate.illustration, `${path}.illustration`, issues);

    if (expectedKind === "normal") {
      validateNormalRecord(candidate, path, issues);
      return;
    }

    validateTokenRecord(candidate, path, issues);
  });
}

function validateNormalRecord(record: JsonRecord, path: string, issues: StaticCatalogValidationIssue[]): void {
  if (!CARD_TYPES.includes(record.type as never)) {
    issues.push(issue("catalog.type.invalid", `${path}.type`, "Normal card type must be creature or spell."));
  }

  if (record.deckBuildable !== true) {
    issues.push(issue("catalog.deck-buildable.invalid", `${path}.deckBuildable`, "Normal cards must be deck-buildable."));
  }

  if (record.type === "creature") {
    validatePositiveInteger(record.attack, `${path}.attack`, "catalog.creature.attack.invalid", "Creature attack must be a positive integer.", issues);
    validatePositiveInteger(record.health, `${path}.health`, "catalog.creature.health.invalid", "Creature health must be a positive integer.", issues);
    return;
  }

  if (record.type === "spell") {
    if (record.attack !== undefined) {
      issues.push(issue("catalog.spell.attack-forbidden", `${path}.attack`, "Spell cards must not define attack."));
    }
    if (record.health !== undefined) {
      issues.push(issue("catalog.spell.health-forbidden", `${path}.health`, "Spell cards must not define health."));
    }
  }
}

function validateTokenRecord(record: JsonRecord, path: string, issues: StaticCatalogValidationIssue[]): void {
  if (!TOKEN_TYPES.includes(record.type as never)) {
    issues.push(issue("catalog.type.invalid", `${path}.type`, "Token type must be creature-token."));
  }

  if (record.deckBuildable !== false) {
    issues.push(issue("catalog.deck-buildable.invalid", `${path}.deckBuildable`, "Tokens must not be deck-buildable."));
  }

  validatePositiveInteger(record.attack, `${path}.attack`, "catalog.creature.attack.invalid", "Token attack must be a positive integer.", issues);
  validatePositiveInteger(record.health, `${path}.health`, "catalog.creature.health.invalid", "Token health must be a positive integer.", issues);

  if (!readString(record.generatedBy)) {
    issues.push(issue("catalog.token.generated-by.required", `${path}.generatedBy`, "Token source marker is required."));
  }
}

function validateCost(value: unknown, path: string, issues: StaticCatalogValidationIssue[]): void {
  if (!Number.isInteger(value) || Number(value) < MIN_COST || Number(value) > MAX_COST) {
    issues.push(issue("catalog.cost.invalid", path, `Cost must be an integer from ${MIN_COST} to ${MAX_COST}.`));
  }
}

function validatePositiveInteger(
  value: unknown,
  path: string,
  code: "catalog.creature.attack.invalid" | "catalog.creature.health.invalid",
  message: string,
  issues: StaticCatalogValidationIssue[]
): void {
  if (!Number.isInteger(value) || Number(value) < 1) {
    issues.push(issue(code, path, message));
  }
}

function validateEffectFields(record: JsonRecord, path: string, issues: StaticCatalogValidationIssue[]): void {
  const effectText = readString(record.effectText);
  if (!effectText) {
    issues.push(issue("catalog.effect-text.required", `${path}.effectText`, "Effect text is required, including no-effect text."));
  }

  const effectIds = record.effectIds;
  if (!Array.isArray(effectIds) || effectIds.some((value) => !readString(value))) {
    issues.push(issue("catalog.effect-ids.invalid", `${path}.effectIds`, "Effect ids must be an array of non-empty strings."));
    return;
  }

  if (effectText && effectText !== "No effect." && effectIds.length === 0) {
    issues.push(issue("catalog.effect-ids.missing-for-effect", `${path}.effectIds`, "Cards with effect text must provide effect ids."));
  }
}

function validateIllustration(value: unknown, path: string, issues: StaticCatalogValidationIssue[]): void {
  const illustration = readString(value);
  if (!illustration || !illustration.startsWith("images/card_illustrations/") || !illustration.endsWith(".png")) {
    issues.push(issue("catalog.illustration.required", path, "Illustration must reference an existing card illustration png path."));
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function issue(code: StaticCatalogValidationIssue["code"], path: string, message: string): StaticCatalogValidationIssue {
  return { code, path, message };
}
