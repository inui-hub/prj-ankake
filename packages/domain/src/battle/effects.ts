import type { BattleCardInstance, BattleEvent, BattleSide, BattleState } from "./types";

export interface SimpleEffectResolution {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

export function resolveSimpleSpellEffect(
  state: BattleState,
  spell: BattleCardInstance,
  side: BattleSide,
  firstSequence: number
): SimpleEffectResolution {
  const events: BattleEvent[] = [
    {
      sequence: firstSequence,
      type: "spell.resolved",
      side,
      instanceId: spell.instanceId,
      message: `${labelSide(side)} cast ${spell.name}.`,
      data: { effectSourceInstanceId: spell.instanceId }
    },
    {
      sequence: firstSequence + 1,
      type: "effect.fizzled",
      side,
      instanceId: spell.instanceId,
      message: `${spell.name}'s card-specific effect is not implemented yet.`,
      data: {
        reason: "effect-deferred",
        effectSourceInstanceId: spell.instanceId
      }
    }
  ];

  return {
    state,
    events
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
