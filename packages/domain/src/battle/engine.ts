import { getLane, setBoardOccupant } from "./board";
import { resolveAfterPlayPhase } from "./automaticPhases";
import { BATTLE_LANES, getCreaturePlayCost, increaseResonance, isResonanceActive, isWindResonanceDiscountAvailable, resonanceGain } from "./resonance";
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
      case "boostCreatureMovement":
        return acceptWaterBoost(state, command);
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
  const windDiscountUsed = isWindResonanceDiscountAvailable(state, command.side, lane);
  const paidCost = getCreaturePlayCost(state, command.side, card, lane);
  const resonance = increaseResonance(player.resonance, lane, card.attribute, resonanceGain(card.cost));
  const nextPlayer: PlayerBattleState = {
    ...player,
    handZone: player.handZone.filter((id) => id !== card.instanceId),
    currentPp: player.currentPp - paidCost,
    resonance,
    resonanceUsage: {
      ...player.resonanceUsage,
      wind: {
        ...player.resonanceUsage.wind,
        [lane]: player.resonanceUsage.wind[lane] || windDiscountUsed
      },
      dark: refreshDarkUsageOnActivation(player.resonance, resonance, player.resonanceUsage.dark)
    }
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
          boardEntrySequence: sequence,
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
  const nextPlayer = spentState.players[command.side];
  const resonance = BATTLE_LANES.reduce(
    (current, lane) => increaseResonance(current, lane, card.attribute, resonanceGain(card.cost)),
    nextPlayer.resonance
  );
  const events: readonly BattleEvent[] = [
    { sequence: state.eventCursor + 1, type: "spell.resolved", side: command.side, instanceId: card.instanceId, message: `${labelSide(command.side)} cast ${card.name}.` },
    ...BATTLE_LANES.map((lane, index) => ({
      sequence: state.eventCursor + 2 + index,
      type: "resonance.changed" as const,
      side: command.side,
      instanceId: card.instanceId,
      message: `${card.attribute} resonance increased in the ${lane} lane.`
    }))
  ];

  return {
    ok: true,
    state: {
      ...spentState,
      players: {
        ...spentState.players,
        [command.side]: {
          ...nextPlayer,
          resonance,
          resonanceUsage: {
            ...nextPlayer.resonanceUsage,
            dark: refreshDarkUsageOnActivation(nextPlayer.resonance, resonance, nextPlayer.resonanceUsage.dark)
          }
        }
      },
      eventCursor: events.at(-1)?.sequence ?? state.eventCursor
    },
    events
  };
}

function acceptWaterBoost(
  state: BattleState,
  command: Extract<BattleCommand, { type: "boostCreatureMovement" }>
): BattleCommandResult {
  const card = state.cardInstances[command.creatureInstanceId] as BattleCardInstance;
  const player = state.players[command.side];
  const lane = getLane(card.position!.column);
  const sequence = state.eventCursor + 1;
  return {
    ok: true,
    state: {
      ...state,
      players: { ...state.players, [command.side]: { ...player, resonanceUsage: { ...player.resonanceUsage, water: { ...player.resonanceUsage.water, [lane]: true } } } },
      cardInstances: { ...state.cardInstances, [card.instanceId]: { ...card, temporaryMovementBonus: (card.temporaryMovementBonus ?? 0) + 1 } },
      eventCursor: sequence
    },
    events: [{ sequence, type: "resonance.effect-resolved", side: command.side, instanceId: card.instanceId, message: `Water resonance increased ${card.name}'s movement.` }]
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
  const resetState = resetTurnFlags(resolution.state, side, resolution.state.activeSide);

  return {
    ok: true,
    state: resetState,
    events: resolution.events
  };
}

function resetTurnFlags(state: BattleState, endingSide: BattleSide, nextSide: BattleSide): BattleState {
  const nextCards = Object.fromEntries(
    Object.entries(state.cardInstances).map(([id, card]) => [
      id,
      card.controllerSide === endingSide || card.controllerSide === nextSide
        ? {
          ...card,
          ...(card.controllerSide === nextSide ? {
            summonedThisTurn: false,
            movedThisTurn: false
          } : {}),
          ...(card.controllerSide === endingSide ? { temporaryMovementBonus: undefined } : {})
          }
        : card
    ])
  );

  return {
    ...state,
    cardInstances: nextCards
  };
}

function refreshDarkUsageOnActivation(
  previous: PlayerBattleState["resonance"],
  next: PlayerBattleState["resonance"],
  usage: PlayerBattleState["resonanceUsage"]["dark"]
): PlayerBattleState["resonanceUsage"]["dark"] {
  return Object.fromEntries(BATTLE_LANES.map((lane) => [
    lane,
    !isResonanceActive(previous, lane, "dark") && isResonanceActive(next, lane, "dark")
      ? false
      : usage[lane]
  ])) as PlayerBattleState["resonanceUsage"]["dark"];
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
