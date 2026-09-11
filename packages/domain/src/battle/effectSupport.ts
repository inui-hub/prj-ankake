import type { EffectModifier, PendingTrigger, TriggerDrainResult } from "./effectTypes";

export function getEffectiveModifiedValue(baseValue: number, modifiers: readonly EffectModifier[], attribute: EffectModifier["attribute"], targetInstanceId: string, turnNumber: number): number {
  return modifiers.filter((modifier) => modifier.targetInstanceId === targetInstanceId && modifier.attribute === attribute && !modifier.invalidated && (modifier.expiresAtTurn === undefined || modifier.expiresAtTurn >= turnNumber)).sort((left, right) => left.startedSequence - right.startedSequence || left.id.localeCompare(right.id)).reduce((value, modifier) => modifier.operator === "set" ? modifier.value : value + modifier.value, baseValue);
}

export function expireModifiers(modifiers: readonly EffectModifier[], turnNumber: number): readonly EffectModifier[] {
  return modifiers.filter((modifier) => modifier.expiresAtTurn === undefined || modifier.expiresAtTurn >= turnNumber);
}

export function drainTriggers<T>(initial: readonly PendingTrigger[], handler: (trigger: PendingTrigger) => { readonly value: T; readonly enqueued?: readonly PendingTrigger[] }, maxDepth = 64): TriggerDrainResult<T> {
  const queue = [...initial].sort(compareTrigger);
  const visited = new Set<string>();
  const values: T[] = [];
  while (queue.length > 0) {
    const trigger = queue.shift()!;
    const key = `${trigger.eventSequence}:${trigger.sourceInstanceId}:${trigger.effectId}`;
    if (trigger.depth > maxDepth || visited.has(key)) return { ok: false, values, rejection: "trigger-loop" };
    visited.add(key);
    const result = handler(trigger);
    values.push(result.value);
    // Children are causally one level deeper than the trigger that emitted
    // them.  Callers cannot reset the depth by reusing a trigger object.
    queue.push(...(result.enqueued ?? []).map((enqueued) => ({ ...enqueued, depth: trigger.depth + 1 })));
    queue.sort(compareTrigger);
  }
  return { ok: true, values };
}

function compareTrigger(left: PendingTrigger, right: PendingTrigger): number { return left.eventSequence - right.eventSequence || left.sourceInstanceId.localeCompare(right.sourceInstanceId) || left.effectId.localeCompare(right.effectId); }
