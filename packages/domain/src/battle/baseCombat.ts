import { getBattleBaseById, updateBattleBase } from "./bases";
import { applyTerminalResult, evaluateBattleTerminal } from "./terminal";
import type {
  BattleBaseId,
  BattleBaseState,
  BattleCardInstanceId,
  BattleEvent,
  BattleRuleResolution,
  BattleSide,
  BattleState
} from "./types";

export function isBaseAttackable(base: BattleBaseState, attackingSide: BattleSide): boolean {
  return base.owner !== attackingSide;
}

export function applyBaseDamage(
  state: BattleState,
  attackingSide: BattleSide,
  attackerId: BattleCardInstanceId,
  baseId: BattleBaseId,
  damage: number,
  sequence: number
): BattleRuleResolution {
  const base = getBattleBaseById(state.bases, baseId);
  if (!isBaseAttackable(base, attackingSide)) {
    return { state, events: [], nextSequence: sequence };
  }

  const appliedDamage = Math.max(0, damage);
  const remainingHp = Math.max(0, Math.min(base.maxHp, base.currentHp - appliedDamage));
  const damagedState: BattleState = {
    ...state,
    bases: updateBattleBase(state.bases, baseId, (current) => ({
      ...current,
      currentHp: remainingHp
    })),
    eventCursor: sequence
  };
  const damageEvent: BattleEvent = {
    sequence,
    type: "base.damaged",
    side: attackingSide,
    instanceId: attackerId,
    message: `${labelSide(attackingSide)} dealt ${appliedDamage} damage to ${baseId}.`,
    data: {
      attackerId,
      baseId,
      damage: appliedDamage,
      remainingHp
    }
  };
  let resolution: BattleRuleResolution = {
    state: damagedState,
    events: [damageEvent],
    nextSequence: sequence + 1
  };

  if (remainingHp > 0) {
    return resolution;
  }

  if (base.kind === "neutral-base") {
    const capture = captureNeutralBase(
      resolution.state,
      attackingSide,
      baseId,
      resolution.nextSequence
    );
    resolution = compose(resolution, capture);
    return appendTerminalIfNeeded(resolution, {
      kind: "neutral-base-captured",
      capturingSide: attackingSide,
      baseId
    });
  }

  return appendTerminalIfNeeded(resolution, {
    kind: "player-base-damaged",
    attackingSide,
    baseId
  });
}

export function captureNeutralBase(
  state: BattleState,
  side: BattleSide,
  baseId: BattleBaseId,
  sequence: number
): BattleRuleResolution {
  const base = getBattleBaseById(state.bases, baseId);
  if (base.kind !== "neutral-base" || base.owner === side) {
    return { state, events: [], nextSequence: sequence };
  }

  const nextState: BattleState = {
    ...state,
    bases: updateBattleBase(state.bases, baseId, (current) => ({
      ...current,
      owner: side,
      currentHp: current.maxHp
    })),
    eventCursor: sequence
  };
  const event: BattleEvent = {
    sequence,
    type: "base.captured",
    side,
    message: `${labelSide(side)} captured ${baseId}.`,
    data: {
      baseId,
      previousOwner: base.owner,
      newOwner: side,
      restoredHp: base.maxHp
    }
  };

  return {
    state: nextState,
    events: [event],
    nextSequence: sequence + 1
  };
}

function appendTerminalIfNeeded(
  resolution: BattleRuleResolution,
  trigger: Parameters<typeof evaluateBattleTerminal>[1]
): BattleRuleResolution {
  const terminal = evaluateBattleTerminal(
    resolution.state,
    trigger,
    resolution.nextSequence
  );
  if (!terminal || resolution.state.terminalResult) {
    return resolution;
  }

  return compose(
    resolution,
    applyTerminalResult(resolution.state, terminal, resolution.nextSequence)
  );
}

function compose(
  previous: BattleRuleResolution,
  next: BattleRuleResolution
): BattleRuleResolution {
  return {
    state: next.state,
    events: [...previous.events, ...next.events],
    nextSequence: next.nextSequence
  };
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
