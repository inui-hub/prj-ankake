import type { BattleCardInstance } from "./types";
import type { ExecutableEffectDefinition } from "./effectTypes";

/** Converts every canonical non-`none` effect into an executable program.
 * Card-specific state transitions live in `cardEffectRuntime`; keeping this
 * mapping explicit makes a missing catalog effect fail closed instead of
 * silently taking the old no-intrinsic-effect path. */
export function getExecutablePlayEffects(
  card: BattleCardInstance
): readonly ExecutableEffectDefinition[] {
  return getExecutableEffects(card, "play");
}

/** True for creature play effects whose documented resolution needs a choice. */
export function hasTargetedSummonEffect(card: BattleCardInstance): boolean {
  return TARGETED_SUMMON_CARD_IDS.has(card.catalogCardId);
}

/** Returns an effect only for the lifecycle that is currently being resolved.
 * Keeping the trigger gate here prevents a summon ability from also firing
 * when its controller later moves the same instance. */
export function getExecutableEffects(
  card: BattleCardInstance,
  trigger: "play" | "summon" | "moved" | "destroyed"
): readonly ExecutableEffectDefinition[] {
  if (card.effectsDisabled) return [];
  if (card.effectIds.length === 0) return [];

  const lifecycle = LIFECYCLE_CARD_IDS[trigger];
  if (trigger !== "play" && !lifecycle.has(card.catalogCardId)) return [];

  const damage = card.effectText.match(
    /敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に(\d+)ダメージを与える。/
  );
  if (damage) {
    return card.effectIds.map((effectId) => ({
      effectId,
      consumedOnFizzle: true,
      operations: [{
        kind: "damage",
        target: "enemy-creature-or-attackable-base",
        amount: Number(damage[1]),
        minimumTargets: 1,
        maximumTargets: 1,
        stopOnFailure: true
      }]
    }));
  }

  if (card.effectText.includes("味方クリーチャーまたは自分の拠点1つを選択する。その対象の体力を3回復する。")) {
    return card.effectIds.map((effectId) => ({
      effectId,
      consumedOnFizzle: true,
      operations: [{
        kind: "heal",
        target: "ally-creature-or-own-base",
        amount: 3,
        minimumTargets: 1,
        maximumTargets: 1,
        stopOnFailure: true
      }]
    }));
  }

  // Preserve every ordered catalog ID.  An unimplemented card-script still
  // emits its explicit runtime event; it is never dropped by a local allowlist.
  return card.effectIds.map((effectId) => ({
    effectId,
    consumedOnFizzle: true,
    operations: [{
      kind: "card-script",
      cardId: card.catalogCardId,
      target: "any-creature",
      minimumTargets: TARGETED_CREATURE_SCRIPT_IDS.has(card.catalogCardId) ? 1 : 0,
      maximumTargets: 64
    }]
  }));
}

const LIFECYCLE_CARD_IDS: Readonly<Record<"play" | "summon" | "moved" | "destroyed", ReadonlySet<string>>> = {
  play: new Set(),
  summon: new Set(["AK-003", "AK-006", "AK-007", "AK-016", "AK-018", "AK-020", "AK-024", "AK-027", "AK-032", "AK-034", "AK-038", "AK-042", "AK-045", "AK-046", "AK-048", "AK-052", "AK-057", "AK-060"]),
  moved: new Set(["AK-022"]),
  destroyed: new Set(["AK-010", "AK-049", "AK-051", "AK-056", "AK-058"])
};

const TARGETED_CREATURE_SCRIPT_IDS = new Set([
  "AK-006", "AK-015", "AK-018", "AK-020", "AK-039", "AK-041", "AK-050", "AK-052", "AK-055"
]);

const TARGETED_SUMMON_CARD_IDS = new Set([
  "AK-003", "AK-006", "AK-007", "AK-012", "AK-018", "AK-020", "AK-038", "AK-042", "AK-046", "AK-048", "AK-052", "AK-057"
]);
