export const CARD_ATTRIBUTES = ["fire", "water", "wind", "light", "dark"] as const;
export const CARD_TYPES = ["creature", "spell"] as const;
export const TOKEN_TYPES = ["creature-token"] as const;

export type CardAttribute = (typeof CARD_ATTRIBUTES)[number];
export type CardType = (typeof CARD_TYPES)[number];
export type TokenType = (typeof TOKEN_TYPES)[number];

export interface VersionMetadata {
  readonly schemaVersion: string;
  readonly catalogVersion: string;
  readonly appVersion: string;
  readonly generatedAt: string;
  readonly sourceDocuments: readonly string[];
}

export interface CatalogRecordBase {
  readonly id: string;
  readonly name: string;
  readonly attribute: CardAttribute;
  readonly cost: number;
  readonly deckBuildable: boolean;
  readonly effectText: string;
  readonly effectIds: readonly string[];
  readonly illustration: string;
}

export interface CreatureCardRecord extends CatalogRecordBase {
  readonly type: "creature";
  readonly attack: number;
  readonly health: number;
  readonly deckBuildable: true;
}

export interface SpellCardRecord extends CatalogRecordBase {
  readonly type: "spell";
  readonly deckBuildable: true;
}

export type CardMasterRecord = CreatureCardRecord | SpellCardRecord;

export interface TokenMasterRecord extends CatalogRecordBase {
  readonly type: "creature-token";
  readonly attack: number;
  readonly health: number;
  readonly deckBuildable: false;
  readonly generatedBy: string;
}

export interface StaticCatalogInput {
  readonly cards: unknown;
  readonly tokens: unknown;
  readonly version: VersionMetadata;
  /** The executable catalog is always built together with its effect manifest. */
  readonly effectManifest: unknown;
}

export type EffectTrigger = "play" | "summon" | "destroyed" | "continuous" | "conditional";

/** Declarative contract owned by the catalog; execution belongs to the resolver unit. */
export interface EffectDefinition {
  readonly effectId: string;
  readonly trigger: EffectTrigger;
  readonly target: "none" | "documented";
  readonly operations: readonly { readonly kind: "documented"; readonly text: string }[];
}

export interface CardEffectManifestEntry {
  readonly cardId: string;
  readonly textDigest: string;
  readonly effects: readonly EffectDefinition[] | "none";
}

export type EffectManifest = readonly CardEffectManifestEntry[];

export interface StaticCatalogSnapshot {
  readonly cards: readonly CardMasterRecord[];
  readonly tokens: readonly TokenMasterRecord[];
  readonly version: VersionMetadata;
  readonly cardsById: ReadonlyMap<string, CardMasterRecord>;
  readonly tokensById: ReadonlyMap<string, TokenMasterRecord>;
  readonly effectsByCardId: ReadonlyMap<string, readonly EffectDefinition[] | "none">;
  readonly normalCardCount: number;
  readonly tokenCount: number;
}

export type StaticCatalogIssueCode =
  | "catalog.cards.not-array"
  | "catalog.cards.count"
  | "catalog.tokens.not-array"
  | "catalog.tokens.count"
  | "catalog.record.not-object"
  | "catalog.id.required"
  | "catalog.id.duplicate"
  | "catalog.name.required"
  | "catalog.attribute.invalid"
  | "catalog.type.invalid"
  | "catalog.cost.invalid"
  | "catalog.deck-buildable.invalid"
  | "catalog.creature.attack.invalid"
  | "catalog.creature.health.invalid"
  | "catalog.spell.attack-forbidden"
  | "catalog.spell.health-forbidden"
  | "catalog.effect-text.required"
  | "catalog.effect-ids.invalid"
  | "catalog.effect-ids.missing-for-effect"
  | "catalog.illustration.required"
  | "catalog.token.generated-by.required"
  | "catalog.effect-manifest.missing"
  | "catalog.effect-manifest.unknown-card"
  | "catalog.effect-manifest.duplicate-card"
  | "catalog.effect-manifest.text-mismatch"
  | "catalog.effect-manifest.definition-missing"
  | "catalog.effect-manifest.placeholder"
  | "catalog.effect-manifest.none-has-definition";

export interface StaticCatalogValidationIssue {
  readonly code: StaticCatalogIssueCode;
  readonly path: string;
  readonly message: string;
}

export type StaticCatalogValidationResult =
  | {
      readonly ok: true;
      readonly cards: readonly CardMasterRecord[];
      readonly tokens: readonly TokenMasterRecord[];
    }
  | {
      readonly ok: false;
      readonly issues: readonly StaticCatalogValidationIssue[];
    };

export type StaticCatalogBuildResult =
  | {
      readonly ok: true;
      readonly snapshot: StaticCatalogSnapshot;
    }
  | {
      readonly ok: false;
      readonly issues: readonly StaticCatalogValidationIssue[];
    };
