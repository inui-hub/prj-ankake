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
  return isWindResonanceDiscountAvailable(state, side, lane)
    ? Math.max(1, card.currentCost - 1)
    : Math.max(0, card.currentCost);
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
  return baseAttack + fireBonus;
}
