import type { BattleBaseId, BattleCommand, LegalAction } from "@ankake/domain";
import type { CpuVisibleBase, CpuVisibleState } from "./visibleState";

export type CpuStopReason =
  | "no-legal-action"
  | "no-beneficial-action"
  | "terminal"
  | "processing-limit";

export interface CpuActionScore {
  readonly action: LegalAction;
  readonly score: number;
  readonly reasons: readonly string[];
}

export type CpuDecision =
  | {
      readonly kind: "command";
      readonly command: BattleCommand;
      readonly score: CpuActionScore;
    }
  | {
      readonly kind: "stop";
      readonly reason: CpuStopReason;
    };

export function chooseCpuAction(visible: CpuVisibleState): CpuDecision {
  if (visible.phase === "terminal") {
    return {
      kind: "stop",
      reason: "terminal"
    };
  }

  const scored = visible.legalActions.map((action) => scoreAction(action, visible));
  const candidates = scored
    .filter((score) => score.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.action.label.localeCompare(right.action.label, "en") ||
        commandTieBreakKey(left.action.command).localeCompare(commandTieBreakKey(right.action.command), "en")
    );

  if (visible.legalActions.length === 0) {
    return {
      kind: "stop",
      reason: "no-legal-action"
    };
  }

  const selected = candidates[0];

  if (!selected) {
    return {
      kind: "stop",
      reason: "no-beneficial-action"
    };
  }

  return {
    kind: "command",
    command: selected.action.command,
    score: selected
  };
}

export function scoreAction(action: LegalAction, visible: CpuVisibleState): CpuActionScore {
  const reasons: string[] = [];
  let score = action.scoreHint;
  const playerBase = getVisibleBaseById(visible.bases, "player-base");
  const cpuBase = getVisibleBaseById(visible.bases, "cpu-base");

  switch (action.command.type) {
    case "summonCreature":
      score += 8;
      reasons.push("develop-board");
      break;
    case "castSpell":
      score += playerBase.currentHp <= 4 ? 20 : 5;
      reasons.push(playerBase.currentHp <= 4 ? "pressure-lethal" : "apply-pressure");
      break;
    case "moveCreature":
      score += 2;
      reasons.push("improve-position");
      break;
    case "endPlayPhase":
      score -= visible.legalActions.length > 1 ? 5 : 0;
      reasons.push("end-phase");
      break;
  }

  if (cpuBase.currentHp <= 5 && action.command.type !== "endPlayPhase") {
    score += 3;
    reasons.push("urgent-defense");
  }

  return {
    action,
    score,
    reasons
  };
}

function getVisibleBaseById(
  bases: readonly CpuVisibleBase[],
  baseId: BattleBaseId
): CpuVisibleBase {
  const base = bases.find((candidate) => candidate.id === baseId);
  if (!base) {
    throw new Error(`Missing required CPU-visible battle base: ${baseId}`);
  }
  return base;
}

function commandTieBreakKey(command: BattleCommand): string {
  switch (command.type) {
    case "summonCreature":
      return `${command.type}:${command.handInstanceId}:${command.destination.column}:${command.destination.row}`;
    case "castSpell":
      return `${command.type}:${command.handInstanceId}`;
    case "moveCreature":
      return `${command.type}:${command.creatureInstanceId}:${command.path.map((step) => `${step.column}:${step.row}`).join("/")}`;
    case "boostCreatureMovement":
      return `${command.type}:${command.creatureInstanceId}`;
    case "endPlayPhase":
      return command.type;
  }
}
