import { createRngFromState } from "./rng";
import { BATTLE_HAND_LIMIT, BATTLE_MAX_PP } from "./constants";
import { resolveAttackPhase } from "./attack";
import { decayResonance } from "./resonance";
import { getLane } from "./board";
import { BATTLE_BASE_IDS } from "./bases";
import { BATTLE_LANES, isResonanceActive } from "./resonance";
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

  const light = resolveLightResonance(attack.state, side, firstSequence + attack.events.length + 1);
  const nextSide = side === "player" ? "cpu" : "player";
  const standby = resolveStandbyPhase(
    {
      ...light.state,
      activeSide: nextSide,
      metadata: {
        ...attack.state.metadata,
        turnNumber: side === "cpu" ? attack.state.metadata.turnNumber + 1 : attack.state.metadata.turnNumber
      }
    },
    nextSide,
    light.nextSequence
  );

  return {
    state: {
      ...standby.state,
      phase: "play",
      activeSide: nextSide
    },
    events: [phaseEnded, ...attack.events, ...light.events, ...standby.events]
  };
}

function resolveLightResonance(state: BattleState, side: BattleSide, firstSequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[]; readonly nextSequence: number } {
  const activeLanes = BATTLE_LANES.filter((lane) => isResonanceActive(state.players[side].resonance, lane, "light"));
  if (activeLanes.length === 0) return { state, events: [], nextSequence: firstSequence };
  const laneSet = new Set(activeLanes);
  const cardInstances = Object.fromEntries(Object.entries(state.cardInstances).map(([id, card]) => {
    if (card.controllerSide !== side || card.zone !== "board" || !card.position || !laneSet.has(getLane(card.position.column))) return [id, card];
    return [id, { ...card, currentHp: Math.min(card.maxHp ?? card.currentHp ?? 0, (card.currentHp ?? 0) + 1) }];
  }));
  const bases = Object.fromEntries(BATTLE_BASE_IDS.map((id) => {
    const base = state.bases[id];
    const shouldHeal = (base.kind === "player-base" && base.owner === side) || (base.kind === "neutral-base" && base.owner === side && laneSet.has(getLane(base.coordinate.column)));
    return [id, shouldHeal ? { ...base, currentHp: Math.min(base.maxHp, base.currentHp + (base.kind === "player-base" ? activeLanes.length : 1)) } : base];
  })) as BattleState["bases"];
  return { state: { ...state, cardInstances, bases, eventCursor: firstSequence }, events: [{ sequence: firstSequence, type: "resonance.effect-resolved", side, message: "Light resonance restored allied units and bases." }], nextSequence: firstSequence + 1 };
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
    currentPp: nextMaxPp,
    resonance: nextTurnsStarted === 1 ? player.resonance : decayResonance(player.resonance),
    resonanceUsage: {
      water: { left: false, center: false, right: false },
      wind: { left: false, center: false, right: false },
      dark: player.resonanceUsage.dark
    }
  };
  let nextCardInstances = Object.fromEntries(Object.entries(state.cardInstances).map(([id, card]) => [id,
    card.movementOverrideExpiresOnSide === side
      ? { ...card, movementOverride: undefined, movementOverrideExpiresOnSide: undefined }
      : card
  ])) as BattleState["cardInstances"];
  const events: BattleEvent[] = [
    ...(nextTurnsStarted === 1 ? [] : [{
      sequence: firstSequence,
      type: "resonance.changed" as const,
      side,
      message: `${labelSide(side)} resonance decayed.`
    }]),
    {
      sequence: firstSequence + (nextTurnsStarted === 1 ? 0 : 1),
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
      players: resetDarkUsageAtTurnStart({ ...state.players, [side]: nextPlayer }),
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
      players: resetDarkUsageAtTurnStart({ ...state.players, [side]: nextPlayer }),
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

function resetDarkUsageAtTurnStart(players: BattleState["players"]): BattleState["players"] {
  return Object.fromEntries((Object.keys(players) as readonly BattleSide[]).map((side) => {
    const player = players[side];
    return [side, {
      ...player,
      resonanceUsage: {
        ...player.resonanceUsage,
        dark: Object.fromEntries(BATTLE_LANES.map((lane) => [
          lane,
          isResonanceActive(player.resonance, lane, "dark") ? false : player.resonanceUsage.dark[lane]
        ])) as PlayerBattleState["resonanceUsage"]["dark"]
      }
    }];
  })) as BattleState["players"];
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
