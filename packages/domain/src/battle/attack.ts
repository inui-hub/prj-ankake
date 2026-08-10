import {
  getAdjacentBoardCoordinates,
  isAdjacentStep,
  setBoardOccupant
} from "./board";
import { BATTLE_BASE_IDS, getBattleBaseById } from "./bases";
import { applyBaseDamage, isBaseAttackable } from "./baseCombat";
import type {
  AttackTarget,
  AttackTargetSnapshot,
  AttackTargetValidation,
  BattleCardInstance,
  BattleCardInstanceId,
  BattleEvent,
  BattleRuleResolution,
  BattleSide,
  BattleState,
  BoardCoordinate
} from "./types";

export interface AutomaticAttackResolution {
  readonly state: BattleState;
  readonly events: readonly BattleEvent[];
}

export function listAttackersInBoardOrder(
  state: BattleState,
  side: BattleSide
): readonly BattleCardInstanceId[] {
  return Object.values(state.cardInstances)
    .filter((card) => isBoardCreature(card) && card.controllerSide === side)
    .sort(compareBoardEntry)
    .map((card) => card.instanceId);
}

export function isWithinBasicAttackRange(
  origin: BoardCoordinate,
  target: BoardCoordinate
): boolean {
  return isAdjacentStep(origin, target);
}

export function snapshotAttackTargets(
  state: BattleState,
  attackerId: BattleCardInstanceId
): AttackTargetSnapshot {
  const attacker = state.cardInstances[attackerId];
  if (!attacker || !isBoardCreature(attacker) || !attacker.position) {
    return { attackerId, targets: [] };
  }

  const adjacentKeys = new Set(
    getAdjacentBoardCoordinates(attacker.position).map(coordinateKey)
  );
  const creatures: AttackTarget[] = Object.values(state.cardInstances)
    .filter(
      (card) =>
        isBoardCreature(card) &&
        card.controllerSide !== attacker.controllerSide &&
        card.position !== undefined &&
        adjacentKeys.has(coordinateKey(card.position))
    )
    .sort(compareBoardEntry)
    .map((card) => ({ kind: "creature", instanceId: card.instanceId }));
  const bases: AttackTarget[] = BATTLE_BASE_IDS.map((baseId) =>
    getBattleBaseById(state.bases, baseId)
  )
    .filter(
      (base) =>
        isBaseAttackable(base, attacker.controllerSide) &&
        adjacentKeys.has(coordinateKey(base.coordinate))
    )
    .map((base) => ({ kind: "base", baseId: base.id }));

  return {
    attackerId,
    targets: [...creatures, ...bases]
  };
}

export function validateAttackTarget(
  state: BattleState,
  attackingSide: BattleSide,
  attackerId: BattleCardInstanceId,
  target: AttackTarget
): AttackTargetValidation {
  const attacker = state.cardInstances[attackerId];
  if (!attacker || !isBoardCreature(attacker) || !attacker.position) {
    return { valid: false, reason: "attacker-unavailable" };
  }

  if (target.kind === "creature") {
    const creature = state.cardInstances[target.instanceId];
    if (!creature) {
      return { valid: false, reason: "target-missing" };
    }
    if (!isBoardCreature(creature) || !creature.position) {
      return { valid: false, reason: "target-left-board" };
    }
    if (creature.controllerSide === attackingSide) {
      return { valid: false, reason: "target-no-longer-enemy" };
    }
    if (!isWithinBasicAttackRange(attacker.position, creature.position)) {
      return { valid: false, reason: "target-out-of-range" };
    }
    return { valid: true, attacker, target: creature };
  }

  const base = state.bases[target.baseId];
  if (!base) {
    return { valid: false, reason: "target-missing" };
  }
  if (!isBaseAttackable(base, attackingSide)) {
    return { valid: false, reason: "target-no-longer-enemy" };
  }
  if (!isWithinBasicAttackRange(attacker.position, base.coordinate)) {
    return { valid: false, reason: "target-out-of-range" };
  }
  return { valid: true, attacker, target: base };
}

export function applyCreatureDamage(
  state: BattleState,
  attacker: BattleCardInstance,
  targetId: BattleCardInstanceId,
  damage: number,
  sequence: number
): BattleRuleResolution {
  const target = state.cardInstances[targetId];
  if (!target || !isBoardCreature(target)) {
    return { state, events: [], nextSequence: sequence };
  }

  const appliedDamage = Math.max(0, damage);
  const remainingHp = Math.max(0, (target.currentHp ?? target.maxHp ?? 0) - appliedDamage);
  const damagedState: BattleState = {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [targetId]: {
        ...target,
        currentHp: remainingHp
      }
    },
    eventCursor: sequence
  };
  const damageEvent: BattleEvent = {
    sequence,
    type: "creature.damaged",
    side: attacker.controllerSide,
    instanceId: attacker.instanceId,
    message: `${attacker.name} dealt ${appliedDamage} damage to ${target.name}.`,
    data: {
      attackerId: attacker.instanceId,
      targetId,
      damage: appliedDamage,
      remainingHp
    }
  };
  const damageResolution: BattleRuleResolution = {
    state: damagedState,
    events: [damageEvent],
    nextSequence: sequence + 1
  };

  if (remainingHp > 0) {
    return damageResolution;
  }

  return compose(
    damageResolution,
    destroyCreature(damagedState, targetId, sequence + 1)
  );
}

export function destroyCreature(
  state: BattleState,
  targetId: BattleCardInstanceId,
  sequence: number
): BattleRuleResolution {
  const target = state.cardInstances[targetId];
  if (!target || !isBoardCreature(target) || !target.position) {
    return { state, events: [], nextSequence: sequence };
  }

  const { position, boardEntrySequence: _boardEntrySequence, ...remainingCard } = target;
  const controller = state.players[target.controllerSide];
  const nextGraveyard = controller.graveyardZone.includes(targetId)
    ? controller.graveyardZone
    : [...controller.graveyardZone, targetId];
  const nextState: BattleState = {
    ...state,
    board: setBoardOccupant(state.board, position, undefined),
    players: {
      ...state.players,
      [target.controllerSide]: {
        ...controller,
        graveyardZone: nextGraveyard
      }
    },
    cardInstances: {
      ...state.cardInstances,
      [targetId]: {
        ...remainingCard,
        zone: "graveyard",
        currentHp: 0
      }
    },
    eventCursor: sequence
  };
  const event: BattleEvent = {
    sequence,
    type: "creature.destroyed",
    side: target.controllerSide,
    instanceId: targetId,
    message: `${target.name} was destroyed.`,
    data: {
      targetId,
      controllerSide: target.controllerSide
    }
  };

  return {
    state: nextState,
    events: [event],
    nextSequence: sequence + 1
  };
}

export function resolveCreatureAttack(
  state: BattleState,
  snapshot: AttackTargetSnapshot,
  sequence: number
): BattleRuleResolution {
  const initialAttacker = state.cardInstances[snapshot.attackerId];
  if (!initialAttacker || !isBoardCreature(initialAttacker)) {
    return {
      state,
      events: [attackerSkippedEvent(sequence, snapshot.attackerId)],
      nextSequence: sequence + 1
    };
  }

  const attack = Math.max(0, initialAttacker.currentAttack ?? 0);
  const startedEvent: BattleEvent = {
    sequence,
    type: "attack.attacker-started",
    side: initialAttacker.controllerSide,
    instanceId: initialAttacker.instanceId,
    message: `${initialAttacker.name} started attacking.`,
    data: {
      attackerId: initialAttacker.instanceId,
      attack,
      targetCount: snapshot.targets.length
    }
  };
  let resolution: BattleRuleResolution = {
    state: { ...state, eventCursor: sequence },
    events: [startedEvent],
    nextSequence: sequence + 1
  };

  for (const target of snapshot.targets) {
    if (resolution.state.terminalResult) {
      break;
    }

    const targetedEvent = createTargetedEvent(
      resolution.nextSequence,
      initialAttacker,
      target
    );
    resolution = appendEvent(resolution, targetedEvent);
    const validation = validateAttackTarget(
      resolution.state,
      initialAttacker.controllerSide,
      initialAttacker.instanceId,
      target
    );
    if (!validation.valid) {
      resolution = appendEvent(
        resolution,
        createTargetSkippedEvent(
          resolution.nextSequence,
          initialAttacker,
          target,
          validation.reason
        )
      );
      if (validation.reason === "attacker-unavailable") {
        break;
      }
      continue;
    }

    const currentAttack = Math.max(0, validation.attacker.currentAttack ?? 0);
    const damageResolution =
      target.kind === "creature"
        ? applyCreatureDamage(
            resolution.state,
            validation.attacker,
            target.instanceId,
            currentAttack,
            resolution.nextSequence
          )
        : applyBaseDamage(
            resolution.state,
            initialAttacker.controllerSide,
            initialAttacker.instanceId,
            target.baseId,
            currentAttack,
            resolution.nextSequence
          );
    resolution = compose(resolution, damageResolution);
  }

  return resolution;
}

export function resolveAttackPhase(
  state: BattleState,
  side: BattleSide,
  firstSequence: number
): AutomaticAttackResolution {
  if (state.terminalResult) {
    return { state, events: [] };
  }

  const attackerIds = listAttackersInBoardOrder(state, side);
  const phaseStarted: BattleEvent = {
    sequence: firstSequence,
    type: "attack.phase-started",
    side,
    message: `${labelSide(side)} attack phase started.`,
    data: { attackerCount: attackerIds.length }
  };
  let resolution: BattleRuleResolution = {
    state: {
      ...state,
      phase: "automatic",
      eventCursor: firstSequence
    },
    events: [phaseStarted],
    nextSequence: firstSequence + 1
  };

  for (const attackerId of attackerIds) {
    if (resolution.state.terminalResult) {
      break;
    }
    const attacker = resolution.state.cardInstances[attackerId];
    if (!attacker || !isBoardCreature(attacker)) {
      resolution = appendEvent(
        resolution,
        attackerSkippedEvent(resolution.nextSequence, attackerId, side)
      );
      continue;
    }
    const snapshot = snapshotAttackTargets(resolution.state, attackerId);
    resolution = compose(
      resolution,
      resolveCreatureAttack(resolution.state, snapshot, resolution.nextSequence)
    );
  }

  if (!resolution.state.terminalResult) {
    resolution = appendEvent(resolution, {
      sequence: resolution.nextSequence,
      type: "attack.phase-ended",
      side,
      message: `${labelSide(side)} attack phase ended.`
    });
  }

  return {
    state: resolution.state,
    events: resolution.events
  };
}

function isBoardCreature(card: BattleCardInstance): boolean {
  return card.zone === "board" && card.type !== "spell" && card.position !== undefined;
}

function compareBoardEntry(left: BattleCardInstance, right: BattleCardInstance): number {
  const sequenceDifference =
    (left.boardEntrySequence ?? Number.MAX_SAFE_INTEGER) -
    (right.boardEntrySequence ?? Number.MAX_SAFE_INTEGER);
  return sequenceDifference || left.instanceId.localeCompare(right.instanceId, "en");
}

function createTargetedEvent(
  sequence: number,
  attacker: BattleCardInstance,
  target: AttackTarget
): BattleEvent {
  return {
    sequence,
    type: "attack.targeted",
    side: attacker.controllerSide,
    instanceId: attacker.instanceId,
    message: `${attacker.name} targeted ${targetId(target)}.`,
    data: targetData(attacker.instanceId, target)
  };
}

function createTargetSkippedEvent(
  sequence: number,
  attacker: BattleCardInstance,
  target: AttackTarget,
  reason: string
): BattleEvent {
  return {
    sequence,
    type: "attack.target-skipped",
    side: attacker.controllerSide,
    instanceId: attacker.instanceId,
    message: `${attacker.name} skipped ${targetId(target)}.`,
    data: {
      ...targetData(attacker.instanceId, target),
      reason
    }
  };
}

function attackerSkippedEvent(
  sequence: number,
  attackerId: BattleCardInstanceId,
  side?: BattleSide
): BattleEvent {
  return {
    sequence,
    type: "attack.attacker-skipped",
    side,
    instanceId: attackerId,
    message: `Attacker ${attackerId} was unavailable.`,
    data: {
      attackerId,
      reason: "attacker-unavailable"
    }
  };
}

function targetData(
  attackerId: BattleCardInstanceId,
  target: AttackTarget
): Readonly<Record<string, string>> {
  return {
    attackerId,
    targetKind: target.kind,
    targetId: targetId(target)
  };
}

function targetId(target: AttackTarget): string {
  return target.kind === "creature" ? target.instanceId : target.baseId;
}

function appendEvent(
  resolution: BattleRuleResolution,
  event: BattleEvent
): BattleRuleResolution {
  return {
    state: { ...resolution.state, eventCursor: event.sequence },
    events: [...resolution.events, event],
    nextSequence: event.sequence + 1
  };
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

function coordinateKey(coordinate: BoardCoordinate): string {
  return `${coordinate.column}:${coordinate.row}`;
}

function labelSide(side: BattleSide): string {
  return side === "player" ? "Player" : "CPU";
}
