import {
  getBoardSquare,
  getOccupantId,
  isAdjacentStep,
  isInsideBoard,
  isSummonRow
} from "./board";
import type {
  BattleCardInstance,
  BattleCommand,
  BattleState,
  BattleValidationIssue,
  BoardCoordinate
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
  const card = state.cardInstances[command.handInstanceId];
  const issues = validateHandCard(state, command.side, card, "creature");

  if (issues.length > 0) {
    return issues;
  }

  const player = state.players[command.side];

  if ((card as BattleCardInstance).currentCost > player.currentPp) {
    return [
      {
        code: "battle.resource.pp-insufficient",
        message: "Not enough PP to play this creature.",
        path: "currentPp"
      }
    ];
  }

  if (!isInsideBoard(command.destination) || !getBoardSquare(state.board, command.destination)) {
    return [
      {
        code: "battle.board.coordinate-invalid",
        message: "The selected square is outside the board.",
        path: "destination"
      }
    ];
  }

  if (!isSummonRow(command.side, command.destination)) {
    return [
      {
        code: "battle.board.destination-invalid",
        message: "Creatures can be summoned only to a legal friendly deployment row.",
        path: "destination"
      }
    ];
  }

  if (getOccupantId(state.board, command.destination)) {
    return [
      {
        code: "battle.board.occupied",
        message: "The selected square is occupied.",
        path: "destination"
      }
    ];
  }

  return [];
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
  const card = state.cardInstances[command.creatureInstanceId];

  if (!card) {
    return [
      {
        code: "battle.card.not-found",
        message: "The selected creature no longer exists.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (card.type !== "creature" || card.zone !== "board" || !card.position) {
    return [
      {
        code: "battle.card.zone-invalid",
        message: "Only creatures on the board can move.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (card.controllerSide !== command.side) {
    return [
      {
        code: "battle.card.owner-invalid",
        message: "Only your own creatures can move.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (card.summonedThisTurn || card.movedThisTurn) {
    return [
      {
        code: "battle.move.already-moved",
        message: "This creature cannot move again this turn.",
        path: "creatureInstanceId"
      }
    ];
  }

  if (command.path.length === 0) {
    return [
      {
        code: "battle.move.path-invalid",
        message: "Movement requires at least one path step.",
        path: "path"
      }
    ];
  }

  if (command.path.length > card.movement) {
    return [
      {
        code: "battle.move.too-far",
        message: "The movement path is longer than this creature's movement.",
        path: "path"
      }
    ];
  }

  let current: BoardCoordinate = card.position;

  for (const [index, step] of command.path.entries()) {
    if (!isInsideBoard(step) || !isAdjacentStep(current, step)) {
      return [
        {
          code: "battle.move.path-invalid",
          message: "Movement paths must use adjacent board squares.",
          path: `path.${index}`
        }
      ];
    }

    const occupantId = getOccupantId(state.board, step);
    if (occupantId && occupantId !== card.instanceId) {
      return [
        {
          code: "battle.board.occupied",
          message: "Movement paths cannot enter occupied squares.",
          path: `path.${index}`
        }
      ];
    }

    current = step;
  }

  return [];
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
