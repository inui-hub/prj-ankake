import { BATTLE_BASE_IDS, getBattleBaseById, getPlayerBaseId } from "./bases";
import type {
  BattleEvent,
  BattleBaseStateMap,
  BattleRuleResolution,
  BattleSide,
  BattleState,
  BattleTerminalReason,
  BattleTerminalResult,
  BattleTerminalTrigger
} from "./types";

export function hasAllNeutralBases(bases: BattleBaseStateMap, side: BattleSide): boolean {
  return BATTLE_BASE_IDS.filter(
    (baseId) => getBattleBaseById(bases, baseId).kind === "neutral-base"
  ).every((baseId) => getBattleBaseById(bases, baseId).owner === side);
}

export function evaluateBattleTerminal(
  state: BattleState,
  trigger: BattleTerminalTrigger,
  finalEventSequence: number
): BattleTerminalResult | undefined {
  if (state.terminalResult) {
    return state.terminalResult;
  }

  const outcome = evaluateTrigger(state, trigger);
  if (!outcome) {
    return undefined;
  }

  return {
    winner: outcome.winner,
    loser: oppositeSide(outcome.winner),
    reason: outcome.reason,
    turnNumber: state.metadata.turnNumber,
    elapsedSeconds: state.metadata.elapsedSeconds,
    finalEventSequence
  };
}

export function applyTerminalResult(
  state: BattleState,
  result: BattleTerminalResult,
  sequence: number
): BattleRuleResolution {
  if (state.terminalResult) {
    return {
      state,
      events: [],
      nextSequence: sequence
    };
  }

  const terminalResult: BattleTerminalResult = {
    ...result,
    finalEventSequence: sequence
  };
  const event: BattleEvent = {
    sequence,
    type: "battle.ended",
    side: terminalResult.winner,
    message: terminalMessage(terminalResult),
    data: {
      winner: terminalResult.winner,
      loser: terminalResult.loser,
      reason: terminalResult.reason
    }
  };

  return {
    state: {
      ...state,
      phase: "terminal",
      terminalResult,
      eventCursor: sequence
    },
    events: [event],
    nextSequence: sequence + 1
  };
}

function evaluateTrigger(
  state: BattleState,
  trigger: BattleTerminalTrigger
): { readonly winner: BattleSide; readonly reason: BattleTerminalReason } | undefined {
  switch (trigger.kind) {
    case "player-base-damaged": {
      const opponent = oppositeSide(trigger.attackingSide);
      const base = getBattleBaseById(state.bases, trigger.baseId);
      if (
        trigger.baseId === getPlayerBaseId(opponent) &&
        base.kind === "player-base" &&
        base.currentHp <= 0
      ) {
        return { winner: trigger.attackingSide, reason: "base-destroyed" };
      }
      return undefined;
    }
    case "neutral-base-captured":
      return hasAllNeutralBases(state.bases, trigger.capturingSide)
        ? { winner: trigger.capturingSide, reason: "neutral-bases-controlled" }
        : undefined;
    case "draw-failed":
      return { winner: oppositeSide(trigger.losingSide), reason: "deck-out" };
    case "quit":
      return { winner: oppositeSide(trigger.losingSide), reason: "quit" };
  }
}

function terminalMessage(result: BattleTerminalResult): string {
  switch (result.reason) {
    case "base-destroyed":
      return `${labelSide(result.winner)} won by destroying the opposing base.`;
    case "neutral-bases-controlled":
      return `${labelSide(result.winner)} won by controlling all neutral bases.`;
    case "deck-out":
      return `${labelSide(result.winner)} won by deck-out.`;
    case "quit":
      return `${labelSide(result.winner)} won after the opponent quit.`;
  }
}

function oppositeSide(side: BattleSide): BattleSide {
  return side === "player" ? "cpu" : "player";
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
