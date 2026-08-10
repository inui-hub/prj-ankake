import { validateMovementPath } from "./movement";
import { getLane } from "./board";
import { getCreaturePlayCost, isResonanceActive } from "./resonance";
import { validateSummonDestination, validateSummonSource } from "./summon";
import type {
  BattleCardInstance,
  BattleCommand,
  BattleState,
  BattleValidationIssue
} from "./types";

export function validateBattleCommand(
  state: BattleState,
  command: BattleCommand
): readonly BattleValidationIssue[] {
  const commonIssues = validateCommon(state, command);
  if (commonIssues.length > 0) {
    return commonIssues;
  }

  switch (command.type) {
    case "summonCreature":
      return validateSummon(state, command);
    case "castSpell":
      return validateSpell(state, command);
    case "moveCreature":
      return validateMove(state, command);
    case "boostCreatureMovement":
      return validateWaterBoost(state, command);
    case "endPlayPhase":
      return [];
  }
}

export function getFirstValidationMessage(issues: readonly BattleValidationIssue[]): string {
  return issues[0]?.message ?? "Command is not legal.";
}

function validateCommon(
  state: BattleState,
  command: BattleCommand
): readonly BattleValidationIssue[] {
  if (state.phase === "terminal" || state.terminalResult) {
    return [
      {
        code: "battle.terminal",
        message: "The battle has already ended."
      }
    ];
  }

  if (state.phase !== "play") {
    return [
      {
        code: "battle.phase.invalid",
        message: "Battle commands can be confirmed only during a play phase."
      }
    ];
  }

  if (state.activeSide !== command.side) {
    return [
      {
        code: "battle.side.inactive",
        message: "It is not this side's turn."
      }
    ];
  }

  return [];
}

function validateSummon(
  state: BattleState,
  command: Extract<BattleCommand, { type: "summonCreature" }>
): readonly BattleValidationIssue[] {
  const sourceIssues = validateSummonSource(state, command.side, command.handInstanceId);
  if (sourceIssues.length > 0) {
    return sourceIssues;
  }

  const destinationIssues = validateSummonDestination(state, command.side, command.destination);
  if (destinationIssues.length > 0) return destinationIssues;
  const card = state.cardInstances[command.handInstanceId] as BattleCardInstance;
  const cost = getCreaturePlayCost(state, command.side, card, getLane(command.destination.column));
  return cost <= state.players[command.side].currentPp ? [] : [{
    code: "battle.resource.pp-insufficient",
    message: "Not enough PP to play this creature.",
    path: "currentPp"
  }];
}

function validateSpell(
  state: BattleState,
  command: Extract<BattleCommand, { type: "castSpell" }>
): readonly BattleValidationIssue[] {
  const card = state.cardInstances[command.handInstanceId];
  const issues = validateHandCard(state, command.side, card, "spell");

  if (issues.length > 0) {
    return issues;
  }

  const player = state.players[command.side];

  if ((card as BattleCardInstance).currentCost > player.currentPp) {
    return [
      {
        code: "battle.resource.pp-insufficient",
        message: "Not enough PP to cast this spell.",
        path: "currentPp"
      }
    ];
  }

  return [];
}

function validateMove(
  state: BattleState,
  command: Extract<BattleCommand, { type: "moveCreature" }>
): readonly BattleValidationIssue[] {
  return validateMovementPath(
    state,
    command.side,
    command.creatureInstanceId,
    command.origin,
    command.path
  );
}

function validateWaterBoost(
  state: BattleState,
  command: Extract<BattleCommand, { type: "boostCreatureMovement" }>
): readonly BattleValidationIssue[] {
  const card = state.cardInstances[command.creatureInstanceId];
  if (!card || card.zone !== "board" || card.type === "spell" || card.controllerSide !== command.side || !card.position) {
    return [{ code: "battle.card.zone-invalid", message: "Only your board creature can receive a movement boost.", path: "creatureInstanceId" }];
  }
  const lane = getLane(card.position.column);
  if (!isResonanceActive(state.players[command.side].resonance, lane, "water")) {
    return [{ code: "battle.resonance.inactive", message: "Water resonance is not active in this lane." }];
  }
  return state.players[command.side].resonanceUsage.water[lane]
    ? [{ code: "battle.resonance.already-used", message: "Water resonance was already used in this lane this turn." }]
    : [];
}

function validateHandCard(
  state: BattleState,
  side: "player" | "cpu",
  card: BattleCardInstance | undefined,
  requiredType: "creature" | "spell"
): readonly BattleValidationIssue[] {
  if (!card) {
    return [
      {
        code: "battle.card.not-found",
        message: "The selected card no longer exists.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.ownerSide !== side || !state.players[side].handZone.includes(card.instanceId)) {
    return [
      {
        code: "battle.card.owner-invalid",
        message: "The selected card is not in this side's hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.zone !== "hand") {
    return [
      {
        code: "battle.card.zone-invalid",
        message: "The selected card is not in hand.",
        path: "handInstanceId"
      }
    ];
  }

  if (card.type !== requiredType) {
    return [
      {
        code: "battle.card.type-invalid",
        message: requiredType === "creature" ? "Only creature cards can be summoned." : "Only spell cards can be cast.",
        path: "handInstanceId"
      }
    ];
  }

  return [];
}
