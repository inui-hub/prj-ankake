import { createRngFromState } from "./rng";
import { BATTLE_HAND_LIMIT, BATTLE_MAX_PP } from "./constants";
import type {
  BattleCardInstance,
  BattleEvent,
  BattleSide,
  BattleState,
  BattleTerminalResult,
  PlayerBattleState
} from "./types";

export interface AutomaticResolution {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

export function resolveAfterPlayPhase(
  state: BattleState,
  side: BattleSide,
  firstSequence: number
): AutomaticResolution {
  const attack = resolveAttackPhase(state, side, firstSequence);
  if (attack.state.terminalResult) {
    return attack;
  }

  const nextSide = side === "player" ? "cpu" : "player";
  const standby = resolveStandbyPhase(
    {
      ...attack.state,
      activeSide: nextSide,
      metadata: {
        ...attack.state.metadata,
        turnNumber: side === "cpu" ? attack.state.metadata.turnNumber + 1 : attack.state.metadata.turnNumber
      }
    },
    nextSide,
    firstSequence + attack.events.length
  );

  return {
    state: {
      ...standby.state,
      phase: "play",
      activeSide: nextSide
    },
    events: [...attack.events, ...standby.events]
  };
}

export function resolveAttackPhase(
  state: BattleState,
  side: BattleSide,
  firstSequence: number
): AutomaticResolution {
  const opponent = side === "player" ? "cpu" : "player";
  const attackers = Object.values(state.cardInstances)
    .filter((card) => card.zone === "board" && card.controllerSide === side)
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  const totalDamage = attackers.reduce((total, card) => total + Math.max(0, card.currentAttack ?? 0), 0);
  const opponentState = state.players[opponent];
  const nextBaseHp = Math.max(0, opponentState.baseHp - totalDamage);
  const events: BattleEvent[] = [
    {
      sequence: firstSequence,
      type: "phase.ended",
      side,
      message: `${labelSide(side)} ended the play phase.`
    },
    {
      sequence: firstSequence + 1,
      type: "attack.resolved",
      side,
      message:
        totalDamage > 0
          ? `${labelSide(side)} creatures attacked for ${totalDamage} total damage.`
          : `${labelSide(side)} had no creatures ready to attack.`,
      data: {
        totalDamage
      }
    }
  ];

  let nextState: BattleState = {
    ...state,
    phase: "automatic",
    players: {
      ...state.players,
      [opponent]: {
        ...opponentState,
        baseHp: nextBaseHp
      }
    }
  };

  if (totalDamage > 0) {
    events.push({
      sequence: firstSequence + 2,
      type: "base.damaged",
      side: opponent,
      message: `${labelSide(opponent)} base is at ${nextBaseHp} HP.`,
      data: {
        baseHp: nextBaseHp
      }
    });
  }

  if (nextBaseHp <= 0) {
    const sequence = firstSequence + events.length;
    const terminal: BattleTerminalResult = {
      winner: side,
      loser: opponent,
      reason: "base-destroyed",
      turnNumber: state.metadata.turnNumber,
      elapsedSeconds: state.metadata.elapsedSeconds,
      finalEventSequence: sequence
    };
    events.push({
      sequence,
      type: "battle.ended",
      side,
      message: `${labelSide(side)} won by destroying the opposing base.`
    });
    nextState = {
      ...nextState,
      phase: "terminal",
      terminalResult: terminal
    };
  }

  return {
    state: {
      ...nextState,
      eventCursor: firstSequence + events.length - 1
    },
    events
  };
}

export function resolveStandbyPhase(
  state: BattleState,
  side: BattleSide,
  firstSequence: number
): AutomaticResolution {
  const player = state.players[side];
  const nextTurnsStarted = player.turnsStarted + 1;
  const nextMaxPp = Math.min(BATTLE_MAX_PP, player.maxPp + 1);
  let nextPlayer: PlayerBattleState = {
    ...player,
    turnsStarted: nextTurnsStarted,
    maxPp: nextMaxPp,
    currentPp: nextMaxPp
  };
  let nextCardInstances = state.cardInstances;
  const events: BattleEvent[] = [
    {
      sequence: firstSequence,
      type: "standby.resolved",
      side,
      message: `${labelSide(side)} recovered to ${nextMaxPp} PP.`,
      data: {
        maxPp: nextMaxPp
      }
    }
  ];

  if (nextPlayer.deckZone.length === 0) {
    const opponent = side === "player" ? "cpu" : "player";
    const sequence = firstSequence + events.length;
    const terminal: BattleTerminalResult = {
      winner: opponent,
      loser: side,
      reason: "deck-out",
      turnNumber: state.metadata.turnNumber,
      elapsedSeconds: state.metadata.elapsedSeconds,
      finalEventSequence: sequence
    };
    events.push({
      sequence,
      type: "deck-out.occurred",
      side,
      message: `${labelSide(side)} could not draw from an empty deck.`
    });
    events.push({
      sequence: sequence + 1,
      type: "battle.ended",
      side: opponent,
      message: `${labelSide(opponent)} won by deck-out.`
    });

    return {
      state: {
        ...state,
        phase: "terminal",
        activeSide: side,
        players: {
          ...state.players,
          [side]: nextPlayer
        },
        terminalResult: terminal,
        eventCursor: sequence + 1
      },
      events
    };
  }

  const drawnId = nextPlayer.deckZone[0] as string;
  const remainingDeck = nextPlayer.deckZone.slice(1);
  const overflow = nextPlayer.handZone.length >= BATTLE_HAND_LIMIT;
  const drawnCard = nextCardInstances[drawnId] as BattleCardInstance;
  const sequence = firstSequence + events.length;

  nextCardInstances = {
    ...nextCardInstances,
    [drawnId]: {
      ...drawnCard,
      zone: overflow ? "graveyard" : "hand"
    }
  };
  nextPlayer = {
    ...nextPlayer,
    deckZone: remainingDeck,
    handZone: overflow ? nextPlayer.handZone : [...nextPlayer.handZone, drawnId],
    graveyardZone: overflow ? [...nextPlayer.graveyardZone, drawnId] : nextPlayer.graveyardZone
  };
  events.push({
    sequence,
    type: overflow ? "card.overflowed" : "card.drawn",
    side,
    instanceId: drawnId,
    message: overflow
      ? `${labelSide(side)} hand was full; the drawn card went to graveyard.`
      : `${labelSide(side)} drew a card.`
  });

  return {
    state: {
      ...state,
      phase: "play",
      activeSide: side,
      players: {
        ...state.players,
        [side]: nextPlayer
      },
      cardInstances: nextCardInstances,
      metadata: {
        ...state.metadata,
        rng: createRngFromState(state.metadata.rng).state
      },
      eventCursor: sequence
    },
    events
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
