import { createRngFromState } from "./rng";
import { BATTLE_HAND_LIMIT, BATTLE_MAX_PP } from "./constants";
import { resolveAttackPhase } from "./attack";
import { applyTerminalResult, evaluateBattleTerminal } from "./terminal";
import type {
  BattleCardInstance,
  BattleEvent,
  BattleSide,
  BattleState,
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
  const phaseEnded: BattleEvent = {
    sequence: firstSequence,
    type: "phase.ended",
    side,
    message: `${labelSide(side)} ended the play phase.`
  };
  const attack = resolveAttackPhase(
    { ...state, phase: "automatic", eventCursor: firstSequence },
    side,
    firstSequence + 1
  );
  if (attack.state.terminalResult) {
    return {
      state: attack.state,
      events: [phaseEnded, ...attack.events]
    };
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
    firstSequence + attack.events.length + 1
  );

  return {
    state: {
      ...standby.state,
      phase: "play",
      activeSide: nextSide
    },
    events: [phaseEnded, ...attack.events, ...standby.events]
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
    const sequence = firstSequence + events.length;
    events.push({
      sequence,
      type: "deck-out.occurred",
      side,
      message: `${labelSide(side)} could not draw from an empty deck.`
    });
    const drawFailedState: BattleState = {
      ...state,
      activeSide: side,
      players: {
        ...state.players,
        [side]: nextPlayer
      },
      eventCursor: sequence
    };
    const terminal = evaluateBattleTerminal(
      drawFailedState,
      { kind: "draw-failed", losingSide: side },
      sequence + 1
    );
    const applied = terminal
      ? applyTerminalResult(drawFailedState, terminal, sequence + 1)
      : { state: drawFailedState, events: [], nextSequence: sequence + 1 };

    return {
      state: applied.state,
      events: [...events, ...applied.events]
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
