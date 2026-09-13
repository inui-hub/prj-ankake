import { getBattleBaseById } from "./bases";
import { destroyCreature } from "./attack";
import { isNormalBoardCoordinate } from "./board";
import { resolveCardEffectScript } from "./cardEffectRuntime";
import type { BattleBaseState, BattleCardInstance, BattleEvent, BattleState } from "./types";
import type { EffectContext, EffectOperation, EffectResolution, EffectTarget } from "./effectTypes";

/** Resolves a catalog-independent effect program. Engine transaction/command mapping remains separate. */
export function resolveEffect(context: EffectContext): EffectResolution {
  const source = context.state.cardInstances[context.sourceInstanceId];
  if (!source || source.controllerSide !== context.controllerSide) return rejected(context, "source-invalid");
  if (!isSelectionShapeValid(context.selection)) return rejected(context, "selection-invalid");

  // Every resolver consumer observes the same canonical selection.  This
  // prevents card scripts from assigning accidental meaning to duplicate or
  // malformed lane, square, or graveyard values.
  context = { ...context, selection: normalizeSelection(context.selection) };

  let state = context.state;
  const events: BattleEvent[] = [];
  let completedOperationCount = 0;
  let failedOperation: { readonly operationIndex: number; readonly reason: "target-count" | "target-invalid" | "operation-invalid" } | undefined;
  for (const [operationIndex, operation] of context.effect.operations.entries()) {
    const targets = resolveTargets(state, context, operation);
    if (targets.length < operation.minimumTargets) {
      failedOperation ??= { operationIndex, reason: "target-count" };
      if (operation.stopOnFailure) break;
      continue;
    }
    const applied = applyOperation(state, context, operation, targets, context.firstSequence + events.length);
    if (!applied) {
      failedOperation ??= { operationIndex, reason: "operation-invalid" };
      if (operation.stopOnFailure) break;
      continue;
    }
    state = applied.state;
    events.push(...applied.events);
    completedOperationCount += 1;
  }
  const status = completedOperationCount === 0 ? "fizzled" : "resolved";
  if (failedOperation) events.push({ sequence: context.firstSequence + events.length, type: "effect.partially-resolved", side: context.controllerSide, instanceId: context.sourceInstanceId, message: `Effect ${context.effect.effectId} partially resolved.`, data: { operationIndex: failedOperation.operationIndex, reason: failedOperation.reason } });
  if (status === "fizzled") events.push({ sequence: context.firstSequence + events.length, type: "effect.fizzled", side: context.controllerSide, instanceId: context.sourceInstanceId, message: `Effect ${context.effect.effectId} fizzled.` });
  // BattleState.metadata.rng is the sole RNG authority; scripts stage it on
  // the returned state together with all other effect mutations.
  return {
    accepted: true,
    state,
    events: events.map((event) => withEffectSource(event, context.sourceInstanceId)),
    effect: { status, completedOperationCount, ...(failedOperation ? { failedOperation } : {}), consumed: status === "resolved" || context.effect.consumedOnFizzle }
  };
}

/** Keep the causal card separate from event.instanceId, which often denotes
 * the affected creature rather than the card that triggered the effect. */
function withEffectSource(event: BattleEvent, sourceInstanceId: string): BattleEvent {
  // Resonance is an independent game rule even when a card effect happened
  // to cause the preceding destruction, so it must not be labelled as a card
  // effect in the log.
  if (event.type === "resonance.effect-resolved") return event;
  return { ...event, data: { ...event.data, effectSourceInstanceId: sourceInstanceId } };
}

export function getLegalEffectTargets(state: BattleState, controllerSide: EffectContext["controllerSide"], operation: EffectOperation): readonly EffectTarget[] {
  const creatures: EffectTarget[] = Object.values(state.cardInstances)
    .filter((card) => card.zone === "board" && matchesCreatureRule(card, controllerSide, operation.target))
    .map((card) => ({ kind: "creature", instanceId: card.instanceId }));
  const bases: EffectTarget[] = supportsBaseTargets(operation.target)
    ? Object.values(state.bases).filter((base) => isBaseTargetValid(base, controllerSide, operation.target)).map((base) => ({ kind: "base", baseId: base.id }))
    : [];
  return [...creatures, ...bases].sort(compareTarget);
}

function resolveTargets(state: BattleState, context: EffectContext, operation: EffectOperation): readonly EffectTarget[] {
  const selected = [...selectionTargets(context.selection)].sort(compareTarget);
  if (selected.length > operation.maximumTargets) return [];
  return selected.filter((target) => isTargetValid(state, context.controllerSide, operation.target, target));
}

function applyOperation(state: BattleState, context: EffectContext, operation: EffectOperation, targets: readonly EffectTarget[], sequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } | undefined {
  if (operation.kind === "card-script") {
    return operation.cardId ? resolveCardEffectScript(state, context, operation.cardId, sequence) : undefined;
  }
  if (operation.kind === "emit") return operation.eventType && operation.message ? { state, events: [{ sequence, type: operation.eventType, side: context.controllerSide, instanceId: context.sourceInstanceId, message: operation.message }] } : undefined;
  if (!Number.isInteger(operation.amount) || operation.amount === undefined || operation.amount <= 0) return undefined;
  if (operation.kind === "damage") return applyHealthDelta(state, context, targets, -operation.amount, sequence, "damaged");
  return applyHealthDelta(state, context, targets, operation.amount, sequence, "healed");
}

function applyHealthDelta(state: BattleState, context: EffectContext, targets: readonly EffectTarget[], delta: number, firstSequence: number, verb: string): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  let next = state;
  const events: BattleEvent[] = [];
  for (const target of targets) {
    if (target.kind === "creature") {
      const card = next.cardInstances[target.instanceId]!;
      const currentHp = Math.max(0, Math.min(card.maxHp ?? card.currentHp ?? 0, (card.currentHp ?? 0) + delta));
      next = { ...next, cardInstances: { ...next.cardInstances, [card.instanceId]: { ...card, currentHp } } };
      events.push({ sequence: firstSequence + events.length, type: "creature.damaged", side: context.controllerSide, instanceId: card.instanceId, message: `${card.name} was ${verb}.`, data: { amount: Math.abs(delta), effectId: context.effect.effectId } });
      if (delta < 0 && currentHp === 0) {
        const destroyed = destroyCreature(next, card.instanceId, firstSequence + events.length);
        next = destroyed.state;
        events.push(...destroyed.events);
      }
    } else {
      const base = getBattleBaseById(next.bases, target.baseId);
      const currentHp = Math.max(0, Math.min(base.maxHp, base.currentHp + delta));
      next = { ...next, bases: { ...next.bases, [base.id]: { ...base, currentHp } } };
      events.push({ sequence: firstSequence + events.length, type: "base.damaged", side: context.controllerSide, message: `Base ${base.id} was ${verb}.`, data: { amount: Math.abs(delta), effectId: context.effect.effectId } });
    }
  }
  return { state: next, events };
}

function isTargetValid(state: BattleState, controllerSide: EffectContext["controllerSide"], rule: EffectOperation["target"], target: EffectTarget): boolean {
  if (target.kind === "base") return isBaseTargetValid(getBattleBaseById(state.bases, target.baseId), controllerSide, rule);
  const card = state.cardInstances[target.instanceId];
  return Boolean(card && card.zone === "board" && matchesCreatureRule(card, controllerSide, rule));
}

function matchesCreatureRule(card: BattleCardInstance, side: EffectContext["controllerSide"], rule: EffectOperation["target"]): boolean {
  return rule === "any-creature" ||
    ((rule === "ally-creature" || rule === "ally-creature-or-own-base") && card.controllerSide === side) ||
    ((rule === "enemy-creature" || rule === "enemy-creature-or-attackable-base") && card.controllerSide !== side);
}
function supportsBaseTargets(rule: EffectOperation["target"]): boolean { return rule === "attackable-base" || rule === "enemy-creature-or-attackable-base" || rule === "ally-creature-or-own-base"; }
function isBaseTargetValid(base: BattleBaseState, side: EffectContext["controllerSide"], rule: EffectOperation["target"]): boolean {
  return base.currentHp > 0 && ((rule === "attackable-base" || rule === "enemy-creature-or-attackable-base") ? base.owner !== side : rule === "ally-creature-or-own-base" && base.owner === side);
}
function selectionTargets(selection: EffectContext["selection"]): readonly EffectTarget[] {
  if (selection.kind === "creatures") return unique(selection.instanceIds).map((instanceId) => ({ kind: "creature", instanceId }));
  if (selection.kind === "base") return [{ kind: "base", baseId: selection.baseId }];
  if (selection.kind !== "structured") return [];
  return [
    ...unique(selection.value.creatureIds ?? []).map((instanceId) => ({ kind: "creature" as const, instanceId })),
    ...unique(selection.value.baseIds ?? []).map((baseId) => ({ kind: "base" as const, baseId }))
  ];
}
function unique<T extends string>(values: readonly T[]): readonly T[] { return [...new Set(values)].sort(); }
function compareTarget(left: EffectTarget, right: EffectTarget): number { const leftKey = left.kind === "creature" ? `0:${left.instanceId}` : `1:${left.baseId}`; const rightKey = right.kind === "creature" ? `0:${right.instanceId}` : `1:${right.baseId}`; return leftKey.localeCompare(rightKey); }
function isSelectionShapeValid(selection: EffectContext["selection"]): boolean {
  if (selection.kind === "creatures") return selection.instanceIds.every(isNonEmptyString);
  if (selection.kind === "base") return isNonEmptyString(selection.baseId);
  if (selection.kind !== "structured") return true;
  const value = selection.value;
  return (value.creatureIds?.every(isNonEmptyString) ?? true) &&
    (value.baseIds?.every(isNonEmptyString) ?? true) &&
    (value.graveyardCardIds?.every(isNonEmptyString) ?? true) &&
    (value.coordinates?.every(isNormalBoardCoordinate) ?? true) &&
    (value.lane === undefined || value.lane === "left" || value.lane === "center" || value.lane === "right");
}
function normalizeSelection(selection: EffectContext["selection"]): EffectContext["selection"] {
  if (selection.kind === "creatures") return { kind: "creatures", instanceIds: unique(selection.instanceIds) };
  if (selection.kind !== "structured") return selection;
  const value = selection.value;
  const coordinates = value.coordinates ? [...new Map(value.coordinates.map((coordinate) => [`${coordinate.column}:${coordinate.row}`, coordinate] as const)).values()].sort((left, right) => left.column - right.column || left.row - right.row) : undefined;
  return { kind: "structured", value: { ...value,
    ...(value.creatureIds ? { creatureIds: unique(value.creatureIds) } : {}),
    ...(value.baseIds ? { baseIds: unique(value.baseIds) } : {}),
    ...(value.graveyardCardIds ? { graveyardCardIds: unique(value.graveyardCardIds) } : {}),
    ...(coordinates ? { coordinates } : {})
  } };
}
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function rejected(context: EffectContext, rejection: "source-invalid" | "selection-invalid"): EffectResolution { return { accepted: false, state: context.state, events: [], rejection }; }
