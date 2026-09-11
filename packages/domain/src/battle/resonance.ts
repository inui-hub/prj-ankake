import { CARD_ATTRIBUTES, type CardAttribute } from "../catalog/types";
import { RESONANCE_MAX } from "./constants";
import { getLane } from "./board";
import type { BattleCardInstance, BattleLane, BattleSide, BattleState, ResonanceMap, ResonanceTurnUsage } from "./types";

export const BATTLE_LANES = ["left", "center", "right"] as const satisfies readonly BattleLane[];

export function createEmptyResonanceUsage(): ResonanceTurnUsage {
  const unused = () => Object.fromEntries(BATTLE_LANES.map((lane) => [lane, false])) as ResonanceTurnUsage["water"];
  return { water: unused(), wind: unused(), dark: unused() };
}

export function createEmptyResonance(): ResonanceMap {
  return Object.fromEntries(
    BATTLE_LANES.map((lane) => [
      lane,
      Object.fromEntries(CARD_ATTRIBUTES.map((attribute) => [attribute, 0]))
    ])
  ) as ResonanceMap;
}

export function increaseResonance(
  resonance: ResonanceMap,
  lane: BattleLane,
  attribute: CardAttribute,
  amount: number
): ResonanceMap {
  const current = resonance[lane][attribute];
  return {
    ...resonance,
    [lane]: {
      ...resonance[lane],
      [attribute]: clampResonance(current + Math.max(0, amount))
    }
  };
}

export function decayResonance(resonance: ResonanceMap): ResonanceMap {
  return Object.fromEntries(
    BATTLE_LANES.map((lane) => [
      lane,
      Object.fromEntries(
        CARD_ATTRIBUTES.map((attribute) => [
          attribute,
          clampResonance(resonance[lane][attribute] - 1)
        ])
      )
    ])
  ) as ResonanceMap;
}

export function clampResonance(value: number): number {
  return Math.min(RESONANCE_MAX, Math.max(0, Math.trunc(value)));
}

export function resonanceGain(originalCost: number): number {
  return Math.min(3, Math.max(0, Math.trunc(originalCost)));
}

export function isResonanceActive(
  resonance: ResonanceMap,
  lane: BattleLane,
  attribute: CardAttribute
): boolean {
  return resonance[lane][attribute] >= 5;
}

export function getCreaturePlayCost(state: BattleState, side: BattleSide, card: BattleCardInstance, lane: BattleLane): number {
  const activeWindLanes = BATTLE_LANES.filter((candidate) =>
    isResonanceActive(state.players[side].resonance, candidate, "wind")
  ).length;
  // These are intrinsic hand-cost effects, so they are evaluated before the
  // lane-specific wind-resonance discount that every creature can use.
  const intrinsicCost = card.catalogCardId === "AK-028"
    ? activeWindLanes > 0 ? 1 : card.currentCost
    : card.catalogCardId === "AK-036"
      ? Math.max(0, card.currentCost - activeWindLanes * 3)
      : card.currentCost;
  return isWindResonanceDiscountAvailable(state, side, lane)
    ? Math.max(1, intrinsicCost - 1)
    : Math.max(0, intrinsicCost);
}

export function isWindResonanceDiscountAvailable(
  state: BattleState,
  side: BattleSide,
  lane: BattleLane
): boolean {
  return isResonanceActive(state.players[side].resonance, lane, "wind")
    && !state.players[side].resonanceUsage.wind[lane];
}

export function getEffectiveCreatureAttack(state: BattleState, card: BattleCardInstance): number {
  const baseAttack = Math.max(0, card.currentAttack ?? card.attack ?? 0);
  if (
    (card.type !== "creature" && card.type !== "creature-token") ||
    card.zone !== "board" ||
    !card.position
  ) {
    return baseAttack;
  }
  const lane = getLane(card.position.column);
  const fireBonus = isResonanceActive(state.players[card.controllerSide].resonance, lane, "fire") ? 1 : 0;
  const berserkerBonus = card.catalogCardId === "AK-004" && !card.effectsDisabled && fireBonus > 0 ? 2 : 0;
  const captainBonus = laneAuraSources(state, card, "AK-009").length;
  const tokenBonus = card.isToken ? laneAuraSources(state, card, "AK-043").length : 0;
  return baseAttack + fireBonus + berserkerBonus + captainBonus + tokenBonus;
}

/** The movement display and path validator must agree on continuous auras. */
export function getEffectiveCreatureMovement(state: BattleState, card: BattleCardInstance): number {
  const baseMovement = card.movementOverride ?? card.movement + (card.temporaryMovementBonus ?? 0);
  const intrinsicMovement = card.catalogCardId === "AK-013" ? Math.max(2, baseMovement) : baseMovement;
  if (card.zone !== "board" || !card.position) return Math.max(0, intrinsicMovement);
  return Math.max(0, intrinsicMovement + laneAuraSources(state, card, "AK-021").length);
}

export function getEffectiveCreatureMaxHp(state: BattleState, card: BattleCardInstance): number {
  const baseHp = card.maxHp ?? card.currentHp ?? 0;
  if (!card.isToken || card.zone !== "board" || !card.position) return baseHp;
  return baseHp + laneAuraSources(state, card, "AK-043").length * 2;
}

export function getEffectiveCreatureCurrentHp(state: BattleState, card: BattleCardInstance): number {
  const baseHp = card.currentHp ?? 0;
  if (!card.isToken || card.zone !== "board" || !card.position) return baseHp;
  return baseHp + laneAuraSources(state, card, "AK-043").length * 2;
}

function laneAuraSources(state: BattleState, target: BattleCardInstance, sourceCardId: string): readonly BattleCardInstance[] {
  if (!target.position) return [];
  const lane = getLane(target.position.column);
  return Object.values(state.cardInstances).filter((source) =>
    source.catalogCardId === sourceCardId &&
    source.instanceId !== target.instanceId &&
    source.zone === "board" &&
    source.controllerSide === target.controllerSide &&
    source.position !== undefined &&
    !source.effectsDisabled &&
    getLane(source.position.column) === lane
  );
}
