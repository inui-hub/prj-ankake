import { getLane, setBoardOccupant } from "./board";
import { resolveAfterPlayPhase } from "./automaticPhases";
import { resolveSimpleSpellEffect } from "./effects";
import { increaseResonance } from "./resonance";
import { validateBattleCommand } from "./validation";
import type {
  BattleCardInstance,
  BattleCommand,
  BattleCommandResult,
  BattleEvent,
  BattleSide,
  BattleState,
  PlayerBattleState
} from "./types";

export const GameEngine = {
  submitCommand(state: BattleState, command: BattleCommand): BattleCommandResult {
    const issues = validateBattleCommand(state, command);
    if (issues.length > 0) {
      return {
        ok: false,
        state,
        issues
      };
    }

    switch (command.type) {
      case "summonCreature":
        return acceptSummon(state, command);
      case "castSpell":
        return acceptSpell(state, command);
      case "moveCreature":
        return acceptMove(state, command);
      case "endPlayPhase":
        return acceptEndPlayPhase(state, command.side);
    }
  }
};

function acceptSummon(
  state: BattleState,
  command: Extract<BattleCommand, { type: "summonCreature" }>
): BattleCommandResult {
  const card = state.cardInstances[command.handInstanceId] as BattleCardInstance;
  const player = state.players[command.side];
  const lane = getLane(command.destination.column);
  const nextPlayer: PlayerBattleState = {
    ...player,
    handZone: player.handZone.filter((id) => id !== card.instanceId),
    currentPp: player.currentPp - card.currentCost,
    resonance: increaseResonance(player.resonance, lane, card.attribute, Math.max(1, card.currentCost))
  };
  const sequence = state.eventCursor + 1;
  const events: readonly BattleEvent[] = [
    {
      sequence,
      type: "creature.summoned",
      side: command.side,
      instanceId: card.instanceId,
      message: `${labelSide(command.side)} summoned ${card.name}.`
    },
    {
      sequence: sequence + 1,
      type: "resonance.changed",
      side: command.side,
      instanceId: card.instanceId,
      message: `${card.attribute} resonance increased in the ${lane} lane.`
    }
  ];

  return {
    ok: true,
    state: {
      ...state,
      board: setBoardOccupant(state.board, command.destination, card.instanceId),
      players: {
        ...state.players,
        [command.side]: nextPlayer
      },
      cardInstances: {
        ...state.cardInstances,
        [card.instanceId]: {
          ...card,
          zone: "board",
          position: command.destination,
          summonedThisTurn: true
        }
      },
      eventCursor: sequence + events.length - 1
    },
    events
  };
}

function acceptSpell(
  state: BattleState,
  command: Extract<BattleCommand, { type: "castSpell" }>
): BattleCommandResult {
  const card = state.cardInstances[command.handInstanceId] as BattleCardInstance;
  const player = state.players[command.side];
  const movedToGraveyard: BattleCardInstance = {
    ...card,
    zone: "graveyard"
  };
  const spentState: BattleState = {
    ...state,
    players: {
      ...state.players,
      [command.side]: {
        ...player,
        handZone: player.handZone.filter((id) => id !== card.instanceId),
        graveyardZone: [...player.graveyardZone, card.instanceId],
        currentPp: player.currentPp - card.currentCost
      }
    },
    cardInstances: {
      ...state.cardInstances,
      [card.instanceId]: movedToGraveyard
    }
  };
  const effect = resolveSimpleSpellEffect(spentState, movedToGraveyard, command.side, state.eventCursor + 1);
  const terminalState = maybeEndByBase(effect.state, command.side, state.eventCursor + effect.events.length + 1);
  const terminalEvents = terminalState.terminalEvent ? [terminalState.terminalEvent] : [];
  const events = [...effect.events, ...terminalEvents];

  return {
    ok: true,
    state: {
      ...terminalState.state,
      eventCursor: state.eventCursor + events.length
    },
    events
  };
}

function acceptMove(
  state: BattleState,
  command: Extract<BattleCommand, { type: "moveCreature" }>
): BattleCommandResult {
  const card = state.cardInstances[command.creatureInstanceId] as BattleCardInstance;
  const destination = command.path[command.path.length - 1] as { column: number; row: number };
  const sequence = state.eventCursor + 1;
  const events: readonly BattleEvent[] = [
    {
      sequence,
      type: "creature.moved",
      side: command.side,
      instanceId: card.instanceId,
      message: `${labelSide(command.side)} moved ${card.name}.`
    }
  ];

  return {
    ok: true,
    state: {
      ...state,
      board: setBoardOccupant(
        setBoardOccupant(state.board, command.origin, undefined),
        destination,
        card.instanceId
      ),
      cardInstances: {
        ...state.cardInstances,
        [card.instanceId]: {
          ...card,
          position: destination,
          movedThisTurn: true
        }
      },
      eventCursor: sequence
    },
    events
  };
}

function acceptEndPlayPhase(state: BattleState, side: BattleSide): BattleCommandResult {
  const resolution = resolveAfterPlayPhase(state, side, state.eventCursor + 1);
  const resetState = resetTurnFlags(resolution.state, resolution.state.activeSide);

  return {
    ok: true,
    state: resetState,
    events: resolution.events
  };
}

function resetTurnFlags(state: BattleState, nextSide: BattleSide): BattleState {
  const nextCards = Object.fromEntries(
    Object.entries(state.cardInstances).map(([id, card]) => [
      id,
      card.controllerSide === nextSide
        ? {
            ...card,
            summonedThisTurn: false,
            movedThisTurn: false
          }
        : card
    ])
  );

  return {
    ...state,
    cardInstances: nextCards
  };
}

function maybeEndByBase(
  state: BattleState,
  actingSide: BattleSide,
  sequence: number
): { readonly state: BattleState; readonly terminalEvent?: BattleEvent } {
  const opponent: BattleSide = actingSide === "player" ? "cpu" : "player";
  if (state.players[opponent].baseHp > 0) {
    return { state };
  }

  const terminalResult = {
    winner: actingSide,
    loser: opponent,
    reason: "base-destroyed" as const,
    turnNumber: state.metadata.turnNumber,
    elapsedSeconds: state.metadata.elapsedSeconds,
    finalEventSequence: sequence
  };

  return {
    state: {
      ...state,
      phase: "terminal",
      terminalResult
    },
    terminalEvent: {
      sequence,
      type: "battle.ended",
      side: actingSide,
      message: `${labelSide(actingSide)} won by destroying the opposing base.`
    }
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
