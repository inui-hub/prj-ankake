import { CARD_ATTRIBUTES, type CardAttribute } from "../catalog/types";
import { RESONANCE_MAX } from "./constants";
import type { BattleLane, ResonanceMap } from "./types";

export const BATTLE_LANES = ["left", "center", "right"] as const satisfies readonly BattleLane[];

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
