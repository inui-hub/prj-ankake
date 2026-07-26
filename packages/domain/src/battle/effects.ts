import type { BattleCardInstance, BattleEvent, BattleSide, BattleState } from "./types";

export interface EffectResolution {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

export function resolveSimpleSpellEffect(
  state: BattleState,
  spell: BattleCardInstance,
  side: BattleSide,
  firstSequence: number
): EffectResolution {
  const opponent = side === "player" ? "cpu" : "player";
  const damage = Math.max(1, Math.ceil(spell.currentCost / 2));
  const opponentState = state.players[opponent];
  const nextBaseHp = Math.max(0, opponentState.baseHp - damage);
  const events: BattleEvent[] = [
    {
      sequence: firstSequence,
      type: "spell.resolved",
      side,
      instanceId: spell.instanceId,
      message: `${labelSide(side)} cast ${spell.name}.`
    },
    {
      sequence: firstSequence + 1,
      type: "base.damaged",
      side: opponent,
      message: `${labelSide(opponent)} base took ${damage} damage.`,
      data: {
        damage,
        baseHp: nextBaseHp
      }
    }
  ];

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [opponent]: {
          ...opponentState,
          baseHp: nextBaseHp
        }
      }
    },
    events
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
