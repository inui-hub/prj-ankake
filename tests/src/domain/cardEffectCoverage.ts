import { CANONICAL_EFFECT_MANIFEST, type EffectTrigger } from "@ankake/domain";

export type EffectCoverageStatus =
  | "verified-executable"
  | "resolver-only-not-integrated"
  | "no-effect-verified"
  | "documented-not-executable";

export interface EffectCoverageRow {
  readonly testId: string;
  readonly cardId: string;
  readonly effectId: string | "none";
  readonly trigger: EffectTrigger | "none";
  readonly initialStateFixture: string;
  readonly selection: string;
  readonly expectedState: string;
  readonly expectedEvents: readonly string[];
  readonly edgeCases: readonly string[];
  /** A deliberate statement of what the current executable catalog can prove. */
  readonly status: EffectCoverageStatus;
}

/**
 * This inventory is intentionally literal rather than derived from the
 * manifest. Adding or removing a canonical card therefore requires a review
 * of its verification row.
 */
export const CANONICAL_CARD_IDS = [
  "AK-001", "AK-002", "AK-003", "AK-004", "AK-005", "AK-006", "AK-007", "AK-008", "AK-009", "AK-010",
  "AK-011", "AK-012", "AK-013", "AK-014", "AK-015", "AK-016", "AK-017", "AK-018", "AK-019", "AK-020",
  "AK-021", "AK-022", "AK-023", "AK-024", "AK-025", "AK-026", "AK-027", "AK-028", "AK-029", "AK-030",
  "AK-031", "AK-032", "AK-033", "AK-034", "AK-035", "AK-036", "AK-037", "AK-038", "AK-039", "AK-040",
  "AK-041", "AK-042", "AK-043", "AK-044", "AK-045", "AK-046", "AK-047", "AK-048", "AK-049", "AK-050",
  "AK-051", "AK-052", "AK-053", "AK-054", "AK-055", "AK-056", "AK-057", "AK-058", "AK-059", "AK-060",
  "AK-T-001", "AK-T-002"
] as const;

export const EXECUTABLE_EFFECT_EXPECTATIONS = {
  "AK-002.primary": { target: "enemy", healthDelta: -2, eventType: "creature.damaged" },
  "AK-003.primary": { target: "enemy", healthDelta: -1, eventType: "creature.damaged" },
  "AK-005.primary": { target: "enemy", healthDelta: -4, eventType: "creature.damaged" },
  "AK-007.primary": { target: "enemy", healthDelta: -3, eventType: "creature.damaged" },
  "AK-012.primary": { target: "enemy", healthDelta: -7, eventType: "creature.damaged" },
  "AK-037.primary": { target: "ally", healthDelta: 3, eventType: "creature.damaged" }
} as const;

/** Every non-`none` catalog effect which has a runtime program.  Keep this
 * literal: a newly documented card must be deliberately classified. */
export const EXECUTABLE_EFFECT_IDS = [
  "AK-002.primary", "AK-003.primary", "AK-004.primary", "AK-005.primary", "AK-006.primary", "AK-007.primary", "AK-008.primary", "AK-009.primary", "AK-010.primary", "AK-011.primary", "AK-012.primary", "AK-013.primary", "AK-015.primary", "AK-016.primary", "AK-017.primary", "AK-018.primary", "AK-019.primary", "AK-020.primary", "AK-021.primary", "AK-022.primary", "AK-023.primary", "AK-024.primary", "AK-025.primary", "AK-026.primary", "AK-027.primary", "AK-028.primary", "AK-029.primary", "AK-030.primary", "AK-031.primary", "AK-032.primary", "AK-033.primary", "AK-034.primary", "AK-036.primary", "AK-037.primary", "AK-038.primary", "AK-039.primary", "AK-041.primary", "AK-042.primary", "AK-043.primary", "AK-044.primary", "AK-045.primary", "AK-046.primary", "AK-047.primary", "AK-048.primary", "AK-049.primary", "AK-050.primary", "AK-051.primary", "AK-052.primary", "AK-054.primary", "AK-055.primary", "AK-056.primary", "AK-057.primary", "AK-058.primary", "AK-059.primary", "AK-060.primary"
] as const;

/** Documented effects with no runtime program as of this inventory. */
export const UNIMPLEMENTED_EFFECT_IDS = [] as const;

const manifestByCardId = new Map(CANONICAL_EFFECT_MANIFEST.map((entry) => [entry.cardId, entry]));

export const CARD_EFFECT_COVERAGE: readonly EffectCoverageRow[] = CANONICAL_CARD_IDS.map((cardId) => {
  const entry = manifestByCardId.get(cardId);
  if (!entry) throw new Error(`Coverage inventory card ${cardId} is absent from the canonical effect manifest.`);

  if (entry.effects === "none") {
    return {
      testId: `COV-${cardId}-NONE`, cardId, effectId: "none", trigger: "none",
      initialStateFixture: "any-valid-battle-state", selection: "none",
      expectedState: "No executable effect program is available.", expectedEvents: [],
      edgeCases: ["no-effect cards must not expose an executable program"], status: "no-effect-verified"
    };
  }

  const effect = entry.effects[0];
  if (!effect) throw new Error(`Coverage inventory card ${cardId} has no primary effect definition.`);
  const executable = (EXECUTABLE_EFFECT_IDS as readonly string[]).includes(effect.effectId);
  return executable
    ? executableRow(cardId, effect.effectId, effect.trigger)
    : {
        testId: `COV-${cardId}-PRIMARY`, cardId, effectId: effect.effectId, trigger: effect.trigger,
        initialStateFixture: "not-applicable-until-operation-is-modelled", selection: "not-applicable",
        expectedState: "Documented effect is not converted to an executable resolver operation.", expectedEvents: [],
        edgeCases: ["coverage gap: operation kind, fixture, and result contract are not implemented"],
        status: "documented-not-executable"
      };
});

function executableRow(cardId: string, effectId: string, trigger: EffectTrigger): EffectCoverageRow {
  const expected = EXECUTABLE_EFFECT_EXPECTATIONS[effectId as keyof typeof EXECUTABLE_EFFECT_EXPECTATIONS];
  return {
    testId: `COV-${cardId}-PRIMARY`, cardId, effectId, trigger,
    initialStateFixture: expected ? (expected.target === "enemy" ? "targeted-enemy-creature" : "injured-ally-creature") : "runtime-program-fixture",
    selection: expected ? `${expected.target}-creature` : "effect-specific structured selection",
    expectedState: expected ? `Target health delta ${expected.healthDelta}.` : "Runtime program resolves and emits at least one event.",
    expectedEvents: expected ? [expected.eventType] : ["effect runtime event"],
    edgeCases: ["missing target fizzles without mutating the resolver input", "candidate order is stable"],
    status: "verified-executable"
  };
}
