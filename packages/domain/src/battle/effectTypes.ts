import type { BattleBaseId, BattleCardInstanceId, BattleEffectSelection, BattleEvent, BattleEventType, BattleSide, BattleState } from "./types";

export type EffectSelection =
  | { readonly kind: "none" }
  | { readonly kind: "creatures"; readonly instanceIds: readonly BattleCardInstanceId[] }
  | { readonly kind: "base"; readonly baseId: BattleBaseId }
  | { readonly kind: "structured"; readonly value: BattleEffectSelection };

export function toEffectSelection(value: BattleEffectSelection | undefined, targetInstanceId?: BattleCardInstanceId, targetBaseId?: BattleBaseId): EffectSelection {
  if (value) return { kind: "structured", value };
  if (targetInstanceId) return { kind: "creatures", instanceIds: [targetInstanceId] };
  if (targetBaseId) return { kind: "base", baseId: targetBaseId };
  return { kind: "none" };
}

export type EffectTarget =
  | { readonly kind: "creature"; readonly instanceId: BattleCardInstanceId }
  | { readonly kind: "base"; readonly baseId: BattleBaseId };

export type EffectTargetRule =
  | "any-creature"
  | "ally-creature"
  | "enemy-creature"
  | "attackable-base"
  | "enemy-creature-or-attackable-base"
  | "ally-creature-or-own-base";

export interface EffectOperation {
  readonly target: EffectTargetRule;
  readonly minimumTargets: number;
  readonly maximumTargets: number;
  readonly stopOnFailure?: boolean;
  readonly kind: "damage" | "heal" | "emit" | "card-script";
  readonly amount?: number;
  readonly eventType?: BattleEventType;
  readonly message?: string;
  /** Stable documented card ID interpreted by the card-effect runtime. */
  readonly cardId?: string;
}

export interface ExecutableEffectDefinition {
  readonly effectId: string;
  readonly operations: readonly EffectOperation[];
  readonly consumedOnFizzle: boolean;
}

export interface EffectContext {
  readonly state: BattleState;
  readonly sourceInstanceId: BattleCardInstanceId;
  readonly controllerSide: BattleSide;
  readonly effect: ExecutableEffectDefinition;
  readonly selection: EffectSelection;
  readonly firstSequence: number;
}

export interface EffectOperationFailure {
  readonly operationIndex: number;
  readonly reason: "target-count" | "target-invalid" | "operation-invalid";
}

export type EffectResolution =
  | { readonly accepted: false; readonly state: BattleState; readonly events: readonly []; readonly rejection: "source-invalid" | "selection-invalid" }
  | { readonly accepted: true; readonly state: BattleState; readonly events: readonly BattleEvent[]; readonly effect: { readonly status: "resolved" | "fizzled"; readonly completedOperationCount: number; readonly failedOperation?: EffectOperationFailure; readonly consumed: boolean } };

export interface EffectModifier {
  readonly id: string;
  readonly targetInstanceId: BattleCardInstanceId;
  readonly attribute: "attack" | "movement";
  readonly operator: "add" | "set";
  readonly value: number;
  readonly startedSequence: number;
  readonly expiresAtTurn?: number;
  readonly invalidated?: boolean;
}

export interface PendingTrigger {
  readonly eventSequence: number;
  readonly sourceInstanceId: BattleCardInstanceId;
  readonly effectId: string;
  readonly depth: number;
  readonly snapshot: Readonly<{ readonly controllerSide: BattleSide; readonly targetIds: readonly string[] }>;
}

export interface TriggerDrainResult<T> {
  readonly ok: boolean;
  readonly values: readonly T[];
  readonly rejection?: "trigger-loop";
}
